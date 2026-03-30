import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { StartKycDto } from './dto/start-kyc.dto';
import { KycService } from '../kyc/kyc.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly kycService: KycService,
  ) {}

  // =========================
  // PROFILE
  // =========================

  @Get('me')
  async getMe(@Req() req) {
    return this.usersService.getProfile(req.user.id);
  }

  @Patch('me')
  async updateMe(@Req() req, @Body() dto: UpdateUserDto) {
    return this.usersService.updateProfile(req.user.id, dto);
  }

  @Patch('me/password')
  async changePassword(
    @Req() req,
    @Body() body: { oldPassword: string; newPassword: string },
  ) {
    await this.usersService.changePassword(
      req.user.id,
      body.oldPassword,
      body.newPassword,
    );

    return { success: true };
  }

  @Delete('me')
  async deleteMe(@Req() req) {
    await this.usersService.deleteUser(req.user.id);
    return { success: true };
  }

  // =========================
  // KYC START
  // =========================

  @Patch('me/kyc/start')
  async startKyc(@Req() req, @Body() dto: StartKycDto) {
    const userId = req.user.id;

    const user = await this.usersService.findById(userId);

    // ❗ Safety gate
    if (!user.emailVerified) {
      throw new ForbiddenException('Email not verified');
    }

    // 1️⃣ Save entered KYC info locally
    await this.usersService.saveKycInfo(userId, dto);

    // 2️⃣ Create Stripe Identity session
    const session = await this.kycService.createKycSession(user);

    // 3️⃣ Persist session + mark pending
    await this.usersService.updateKycState(userId, session.id);

    // 4️⃣ Frontend redirects user to Stripe
    return {
      verificationUrl: session.url,
    };
  }
}
