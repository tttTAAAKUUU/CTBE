import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Req,
  UseGuards,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthService } from '../auth/auth.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { StartKycDto } from './dto/start-kyc.dto';
import { KycService } from '../kyc/kyc.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly kycService: KycService,

    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

  @Get('me')
  async getMe(@Req() req) {
    return this.usersService.getProfile(req.user.id);
  }

  @Patch('me')
  async updateMe(
    @Req() req,
    @Body() body: UpdateUserDto & { code?: string },
  ) {
    const { code, ...dto } = body;

    // If email is changing, require a 2FA action code.
    if (dto.email) {
      const currentUser = await this.usersService.findById(req.user.id);
      if (dto.email !== currentUser.email) {
        if (!code) throw new BadRequestException('Verification code required to change email');
        await this.authService.verifyActionCode(req.user.id, code);
      }
    }

    return this.usersService.updateProfile(req.user.id, dto);
  }

  @Patch('me/password')
  async changePassword(
    @Req() req,
    @Body() body: { oldPassword: string; newPassword: string; code: string },
  ) {
    if (!body.code) throw new BadRequestException('Verification code required');

    // Verify the action code first (single-use, clears on success)
    await this.authService.verifyActionCode(req.user.id, body.code);

    // Then do the password change
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

  @Patch('me/kyc/start')
  async startKyc(@Req() req, @Body() dto: StartKycDto) {
    const userId = req.user.id;
    const user = await this.usersService.findById(userId);

    if (!user.emailVerified) {
      throw new ForbiddenException('Email not verified');
    }

    await this.usersService.saveKycInfo(userId, dto);
    const session = await this.kycService.createKycSession(user);
    await this.usersService.updateKycState(userId, session.id);

    return {
      verificationUrl: session.url,
    };
  }
}
