// src/positions/position.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../users/entities/user/user.entity';
import { Market } from '../markets/entities/market.entity';
import { Competition } from '../competitions/entities/competition.entity';

@Entity()
export class Position {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  user: User;

  @ManyToOne(() => Market)
  market: Market;

  @Column()
  side: 'LONG' | 'SHORT';

  @Column('decimal')
  stake: number;

  @Column('decimal')
  entryPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  exitPrice: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  stopLoss: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  takeProfit: number | null;

  // ✅ NEW: trailing stop support
  @Column('decimal', { nullable: true })
  trailingPercent: number | null;

  @Column('decimal', { nullable: true })
  bestPrice: number | null;

  @Column({ default: 'OPEN' })
  status: 'OPEN' | 'CLOSED';

  @CreateDateColumn()
  openedAt: Date;

  @Column({ type: 'timestamptz', nullable: true }) // Explicitly set type to timestamptz
  closedAt: Date | null;

  @ManyToOne(() => Competition, (comp) => comp.positions)
  competition: Competition; // Links this trade to a specific contest
}
