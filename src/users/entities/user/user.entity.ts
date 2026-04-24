// src/users/entities/user/user.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
} from 'typeorm';
import { Competition } from '../../../competitions/entities/competition.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({
    type: 'enum',
    enum: ['user', 'admin'],
    default: 'user',
  })
  role: 'user' | 'admin';

  @Column()
  userName: string;

  @Column({ nullable: true })
  firstName?: string;

  @Column({ nullable: true })
  lastName?: string;

  @Column({ nullable: true })
  dateOfBirth?: string;

  @Column({ nullable: true })
  addressLine1?: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  country?: string;

  @Column({ nullable: true })
  kycSessionId?: string;

  @Column({
    type: 'enum',
    enum: ['none', 'pending', 'approved', 'rejected'],
    default: 'none',
  })
  kycStatus: 'none' | 'pending' | 'approved' | 'rejected';

  @Column({ default: false })
  kycVerified: boolean;

  @Column({ type: 'varchar', length: 6, nullable: true })
  emailVerificationCode: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  emailVerificationExpiresAt: Date | null;

  @Column({ default: false })
  emailVerified: boolean;

  // ─── 2FA: Login OTP ──────────────────────────────
  @Column({ type: 'varchar', length: 6, nullable: true })
  loginOtp: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  loginOtpExpiresAt: Date | null;

  // ─── 2FA: Sensitive-action OTP ───────────────────
  @Column({ type: 'varchar', length: 6, nullable: true })
  actionOtp: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  actionOtpExpiresAt: Date | null;

  // ─── Password reset OTP ─────────────────────────
  @Column({ type: 'varchar', length: 6, nullable: true })
  resetOtp: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  resetOtpExpiresAt: Date | null;

  // ─── 2FA: Trusted device tokens ──────────────────
  @Column({ type: 'jsonb', nullable: true, default: () => "'[]'" })
  trustedDevices: Array<{ tokenHash: string; expiresAt: string }> | null;

  // Inverse relationship to see joined competitions
  @ManyToMany(() => Competition, (competition) => competition.participants)
  joinedCompetitions: Competition[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
