import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { generateOtp } from './utils/otp.util';
import {
  generateDeviceToken,
  hashDeviceToken,
  isDeviceTrusted,
  addTrustedDevice,
} from './utils/device-fingerprint.util';
import { MailService } from '../mail/mail.service';
import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) throw new UnauthorizedException('Invalid credentials');

    const { password: _password, ...result } = user;
    return result;
  }

  /** Issue a normal access token. */
  private issueAccessToken(user: { id: number; email: string }) {
    const payload = { sub: user.id, email: user.email };
    return { access_token: this.jwtService.sign(payload) };
  }

  /** Short-lived token used ONLY to call /auth/2fa/verify. */
  private issueTempToken(userId: number): string {
    return this.jwtService.sign(
      { sub: userId, purpose: '2fa-pending' },
      { expiresIn: '10m' },
    );
  }

  async login(
    user: { id: number; email: string },
    deviceToken?: string,
  ) {
    const dbUser = await this.usersService.findById(user.id);

    // Trusted device? skip 2FA.
    if (isDeviceTrusted(dbUser.trustedDevices, deviceToken)) {
      return {
        requires2FA: false,
        ...this.issueAccessToken(user),
      };
    }

    // Otherwise, send OTP and return tempToken.
    const otp = generateOtp();
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    await this.usersService.setLoginOtp(user.id, otp, expires);

    try {
      await this.mailService.sendLoginCode(user.email, otp);
    } catch (err) {
      console.error('❌ Failed to send login 2FA email:', err);
      // Still return tempToken so dev can check server logs for OTP
      console.log(`📧 [DEV] Login OTP for ${user.email}: ${otp}`);
    }

    return {
      requires2FA: true,
      tempToken: this.issueTempToken(user.id),
    };
  }

  async verify2faLogin(tempToken: string, code: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(tempToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }
    if (payload.purpose !== '2fa-pending') {
      throw new UnauthorizedException('Wrong token type');
    }

    const user = await this.usersService.findById(payload.sub);

    if (!user.loginOtp || !user.loginOtpExpiresAt) {
      throw new BadRequestException('No pending code. Try logging in again.');
    }
    if (user.loginOtp !== code) {
      throw new BadRequestException('Invalid code');
    }
    if (user.loginOtpExpiresAt < new Date()) {
      throw new BadRequestException('Code expired. Log in again.');
    }

    await this.usersService.clearLoginOtp(user.id);

    const rawDeviceToken = generateDeviceToken();
    const updatedDevices = addTrustedDevice(
      user.trustedDevices,
      hashDeviceToken(rawDeviceToken),
    );
    await this.usersService.setTrustedDevices(user.id, updatedDevices);

    return {
      ...this.issueAccessToken({ id: user.id, email: user.email }),
      deviceToken: rawDeviceToken,
    };
  }

  async resend2faLoginCode(tempToken: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(tempToken);
    } catch {
      throw new UnauthorizedException('Session expired, please log in again');
    }
    if (payload.purpose !== '2fa-pending') {
      throw new UnauthorizedException('Wrong token type');
    }

    const user = await this.usersService.findById(payload.sub);
    const otp = generateOtp();
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    await this.usersService.setLoginOtp(user.id, otp, expires);
    try {
      await this.mailService.sendLoginCode(user.email, otp);
    } catch (err) {
      console.error('❌ Failed to resend login code:', err);
      console.log(`📧 [DEV] Login OTP for ${user.email}: ${otp}`);
    }
    return { success: true };
  }

  async requestActionCode(userId: number, action: string) {
    const user = await this.usersService.findById(userId);
    const otp = generateOtp();
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    await this.usersService.setActionOtp(user.id, otp, expires);

    const readableAction =
      action === 'change-password' ? 'change your password'
      : action === 'change-email' ? 'change your email'
      : 'confirm a sensitive action';

    try {
      await this.mailService.sendActionCode(user.email, otp, readableAction);
    } catch (err) {
      console.error('❌ Failed to send action code:', err);
      console.log(`📧 [DEV] Action OTP for ${user.email}: ${otp}`);
    }
    return { success: true };
  }

  async verifyActionCode(userId: number, code: string): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user.actionOtp || !user.actionOtpExpiresAt) {
      throw new BadRequestException('No pending action code. Request one first.');
    }
    if (user.actionOtp !== code) {
      throw new BadRequestException('Invalid code');
    }
    if (user.actionOtpExpiresAt < new Date()) {
      throw new BadRequestException('Code expired. Request a new one.');
    }
    await this.usersService.clearActionOtp(userId);
  }

  async register(dto: CreateUserDto) {
    const user = await this.usersService.create(dto);
    return this.issueAccessToken({ id: user.id, email: user.email });
  }

  // =========================
  // Password reset (forgot-password flow)
  // =========================
  async requestPasswordReset(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('Email isn\'t a registered user');
    }

    const otp = generateOtp();
    const expires = new Date(Date.now() + 15 * 60 * 1000);
    await this.usersService.setResetOtp(user.id, otp, expires);

    try {
      await this.mailService.sendPasswordResetCode(user.email, otp);
    } catch (err) {
      console.error('❌ Failed to send password reset email:', err);
      console.log(`📧 [DEV] Password reset OTP for ${user.email}: ${otp}`);
    }
    return { success: true };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new BadRequestException('Invalid code');
    if (!user.resetOtp || !user.resetOtpExpiresAt) {
      throw new BadRequestException('No pending reset. Request a new code.');
    }
    if (user.resetOtp !== code) throw new BadRequestException('Invalid code');
    if (user.resetOtpExpiresAt < new Date()) {
      throw new BadRequestException('Code expired. Request a new one.');
    }

    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const hashed = await bcrypt.hash(newPassword, saltRounds);
    await this.usersService.setPasswordHash(user.id, hashed);
    await this.usersService.clearResetOtp(user.id);

    return { success: true };
  }

  async verifyEmail(email: string, code: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new NotFoundException('User not found');
    if (user.emailVerified) throw new BadRequestException('Email already verified');
    if (!user.emailVerificationCode || !user.emailVerificationExpiresAt) {
      throw new BadRequestException('No verification code found');
    }
    if (user.emailVerificationCode !== code) throw new BadRequestException('Invalid code');
    if (user.emailVerificationExpiresAt < new Date()) throw new BadRequestException('Code expired');

    await this.usersService.markEmailAsVerified(user.id);
    return { success: true };
  }
}
