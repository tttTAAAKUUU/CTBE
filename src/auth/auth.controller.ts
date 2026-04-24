import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import {
  Verify2faLoginDto,
  RequestActionCodeDto,
} from './dto/two-factor.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Req() req) {
    return req.user;
  }

  @Post('register')
  async register(@Body() dto: CreateUserDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(
    @Body() body: { email: string; password: string; deviceToken?: string },
  ) {
    const user = await this.authService.validateUser(body.email, body.password);
    return this.authService.login(user, body.deviceToken);
  }

  // ─── 2FA ENDPOINTS ───────────────────────────

  @Post('2fa/verify')
  async verify2fa(@Body() dto: Verify2faLoginDto) {
    return this.authService.verify2faLogin(dto.tempToken, dto.code);
  }

  @Post('2fa/resend-login-code')
  async resendLoginCode(@Body() body: { tempToken: string }) {
    return this.authService.resend2faLoginCode(body.tempToken);
  }

  @Post('2fa/request-action-code')
  @UseGuards(JwtAuthGuard)
  async requestActionCode(
    @Req() req,
    @Body() dto: RequestActionCodeDto,
  ) {
    return this.authService.requestActionCode(req.user.id, dto.action);
  }

  @Post('verify-email')
  async verifyEmail(@Body() body: { email: string; code: string }) {
    return this.authService.verifyEmail(body.email, body.code);
  }

  // ─── Forgot / reset password ─────────────────
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.email, dto.code, dto.newPassword);
  }
}
