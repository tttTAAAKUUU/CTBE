// src/users/entities/user/user.entity.ts
import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn, 
  ManyToMany 
} from 'typeorm';
import { Competition } from '../../../competitions/entities/competition.entity'; // ✅ Import Competition

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

  // ✅ NEW: Inverse relationship to see joined competitions
  @ManyToMany(() => Competition, (competition) => competition.participants)
  joinedCompetitions: Competition[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}