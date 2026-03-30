import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Wallet } from './wallet.entity';

export type TransactionType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'BET_LOCK'
  | 'BET_SETTLEMENT';

export type TransactionStatus =
  | 'PENDING'
  | 'COMPLETED'
  | 'FAILED';

@Entity()
export class WalletTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Wallet)
  wallet: Wallet;

  @Column()
  type: TransactionType;

  @Column()
  amount: number;

  @Column()
  status: TransactionStatus;

  @Column({ unique: true })
  reference: string;

  @CreateDateColumn()
  createdAt: Date;
}
