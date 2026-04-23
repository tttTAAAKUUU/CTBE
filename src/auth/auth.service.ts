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

  /**
   * Issue a normal access token. Used when 2FA is NOT required
   * (trusted device) and after a successful 2FA verify.
   */
  private issueAccessToken(user: { id: number; email: string }) {
    const payload = { sub: user.id, email: user.email };
    return { access_token: this.jwtService.sign(payload) };
  }

  /**
   * Short-lived token used ONLY to call /auth/2fa/verify.
   * Separate secret path (via payload.purpose) so it can't be used as an
   * access token.
   */
  private issueTempToken(userId: number): string {
    return this.jwtService.sign(
      { sub: userId, purpose: '2fa-pending' },
      { expiresIn: '10m' },
    );
  }

  /**
   * Called by /auth/login controller.
   * Returns either a real JWT (if device trusted) or a { requires2FA, tempToken }
   * response (if not trusted).
   */
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

    // Otherwise, send an OTP and return a tempToken.
    const otp = generateOtp();
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    await this.usersService.setLoginOtp(user.id, otp, expires);

    try {
      await this.mailService.sendLoginCode(user.email, otp);
    } catch (err) {
      console.error('❌ Failed to send login 2FA email:', err);
      throw new BadRequestException(
        'Could not send verification code. Try again later.',
      );
    }

    return {
      requires2FA: true,
      tempToken: this.issueTempToken(user.id),
    };
  }

  /**
   * Called by /auth/2fa/verify.
   * Validates code, clears it, returns real JWT + a fresh device token
   * to remember this device.
   */
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

    // Clear the OTP
    await this.usersService.clearLoginOtp(user.id);

    // Issue a fresh device token + persist its hash
    const rawDeviceToken = generateDeviceToken();
    const updatedDevices = addTrustedDevice(
      user.trustedDevices,
      hashDeviceToken(rawDeviceToken),
    );
    await this.usersService.setTrustedDevices(user.id, updatedDevices);

    return {
      ...this.issueAccessToken({ id: user.id, email: user.email }),
      deviceToken: rawDeviceToken, // frontend stores this in localStorage
    };
  }

  /**
   * Resend login code using the same tempToken.
   */
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
    await this.mailService.sendLoginCode(user.email, otp);
    return { success: true };
  }

  /**
   * Called by /auth/2fa/request-action-code (for change-password / change-email).
   */
  async requestActionCode(userId: number, action: string) {
    const user = await this.usersService.findById(userId);
    const otp = generateOtp();
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    await this.usersService.setActionOtp(user.id, otp, expires);

    const readableAction =
      action === 'change-password' ? 'change your password'
      : action === 'change-email' ? 'change your email'
      : 'confirm a sensitive action';

    await this.mailService.sendActionCode(user.email, otp, readableAction);
    return { success: true };
  }

  /**
   * Called internally by UsersService when user submits a sensitive-action form.
   * Throws if invalid. Clears the code on success (single-use).
   */
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

  // ─── UNCHANGED BELOW ─────────────────────────────────

  async register(dto: CreateUserDto) {
    const user = await this.usersService.create(dto);
    // Register auto-logs-in without 2FA since it's a brand-new account.
    // The user hasn't set up email verification yet; KYC gate handles auth flow.
    return this.issueAccessToken({ id: user.id, email: user.email });
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
