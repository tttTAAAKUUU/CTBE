import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { generateOtp } from './utils/otp.util';
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
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // remove password before returning
    const { password: _password, ...result } = user;
    return result;
  }

  async login(user: { id: number; email: string }) {
    const payload = {
      sub: user.id,
      email: user.email,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(dto: CreateUserDto) {
    const user = await this.usersService.create(dto);

    return this.login({
      id: user.id,
      email: user.email,
    });
  }

  async verifyEmail(email: string, code: string) {
  const user = await this.usersService.findByEmail(email);

  if (!user) {
    throw new NotFoundException('User not found');
  }

  if (user.emailVerified) {
    throw new BadRequestException('Email already verified');
  }

  if (!user.emailVerificationCode || !user.emailVerificationExpiresAt) {
    throw new BadRequestException('No verification code found');
  }

  if (user.emailVerificationCode !== code) {
    throw new BadRequestException('Invalid code');
  }

  if (user.emailVerificationExpiresAt < new Date()) {
    throw new BadRequestException('Code expired');
  }

  await this.usersService.markEmailAsVerified(user.id);

  return { success: true };
}


}
