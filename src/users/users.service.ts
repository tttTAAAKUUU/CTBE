import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from './entities/user/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { StartKycDto } from './dto/start-kyc.dto';
import { WalletsService } from 'src/wallet/wallet.service';
import { generateOtp } from '../auth/utils/otp.util';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,

    @Inject(forwardRef(() => WalletsService))
    private readonly walletService: WalletsService,
  ) {}

  // =========================
  // CREATE USER
  // =========================
  async create(dto: CreateUserDto): Promise<Omit<User, 'password'>> {
  const existing = await this.usersRepo.findOne({
    where: { email: dto.email },
  });

  if (existing) {
    throw new ConflictException('Email already in use');
  }

  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
  const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

  const otp = generateOtp();
  const expires = new Date(Date.now() + 10 * 60 * 1000);

  const user = this.usersRepo.create({
    email: dto.email,
    userName: dto.userName,
    password: hashedPassword,
    emailVerified: false,
    emailVerificationCode: otp,
    emailVerificationExpiresAt: expires,
    kycStatus: 'none',
    kycVerified: false,
    role: 'user',
  });

  const saved: User = await this.usersRepo.save(user);

  await this.walletService.createWalletForUser(saved);

  console.log(`📧 OTP for ${saved.email}:`, otp);

  const { password, ...result } = saved;
  return result;
}


async markEmailAsVerified(userId: number) {
  await this.usersRepo.update(userId, {
  emailVerified: true,
  emailVerificationCode: null,
  emailVerificationExpiresAt: null,
});

}



  // 🔐 Hash password


  // =========================
  // FINDERS
  // =========================
  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { email } });
  }

  async findById(id: number): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  // =========================
  // PROFILE
  // =========================
  async getProfile(id: number): Promise<Omit<User, 'password'>> {
    const user = await this.findById(id);
    const { password, ...result } = user;
    return result;
  }

  async updateProfile(
    id: number,
    dto: UpdateUserDto,
  ): Promise<Omit<User, 'password'>> {
    const user = await this.findById(id);

    if (dto.email && dto.email !== user.email) {
      const emailTaken = await this.usersRepo.findOne({
        where: { email: dto.email },
      });

      if (emailTaken) {
        throw new ConflictException('Email already in use');
      }
    }

    Object.assign(user, dto);

    const saved: User = await this.usersRepo.save(user);

    const { password, ...result } = saved;

    return result;
  }

  // =========================
  // PASSWORD
  // =========================
  async changePassword(
    id: number,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.findById(id);

    const matches = await bcrypt.compare(oldPassword, user.password);
    if (!matches) {
      throw new BadRequestException('Old password is incorrect');
    }

    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
    user.password = await bcrypt.hash(newPassword, saltRounds);

    await this.usersRepo.save(user);
  }

  // =========================
  // DELETE
  // =========================
  async deleteUser(id: number): Promise<void> {
    const result = await this.usersRepo.delete({ id });

    if (result.affected === 0) {
      throw new NotFoundException('User not found');
    }
  }

  // =========================
  // KYC
  // =========================
  async updateKycState(
    userId: number,
    sessionId: string,
  ): Promise<void> {
    await this.usersRepo.update(
      { id: userId },
      {
        kycSessionId: sessionId,
        kycStatus: 'pending',
        kycVerified: false,
      },
    );
  }

  async setKycVerified(
    userId: number,
    verified: boolean,
  ): Promise<void> {
    await this.usersRepo.update(
      { id: userId },
      {
        kycVerified: verified,
        kycStatus: verified ? 'approved' : 'rejected',
      },
    );
  }

  async updateKycProfile(
    userId: number,
    dto: StartKycDto,
  ): Promise<void> {
    const user = await this.findById(userId);

    Object.assign(user, {
      firstName: dto.firstName,
      lastName: dto.lastName,
      dateOfBirth: dto.dateOfBirth,
      addressLine1: dto.addressLine1,
      city: dto.city,
      country: dto.country,
    });

    await this.usersRepo.save(user);
  }

  async saveKycInfo(
    userId: number,
    dto: StartKycDto,
  ): Promise<void> {
    const user = await this.findById(userId);

    user.firstName = dto.firstName;
    user.lastName = dto.lastName;
    user.dateOfBirth = dto.dateOfBirth;
    user.addressLine1 = dto.addressLine1;
    user.country = dto.country;

    await this.usersRepo.save(user);
  }
}
