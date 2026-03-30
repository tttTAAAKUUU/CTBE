// src/betting/entities/bet.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user/user.entity';
import { Market } from '../../markets/entities/market.entity';
import { MarketSnapshot } from '../../markets/entities/market-snapshot.entity';

@Entity()
export class Bet {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  user: User;

  @ManyToOne(() => Market)
  market: Market;

  @ManyToOne(() => MarketSnapshot)
  entrySnapshot: MarketSnapshot;

  @Column('decimal')
  stake: number;

  @Column('decimal')
  lockedAmount: number;

  @Column()
  direction: 'UP' | 'DOWN';

  @Column()
  status: 'OPEN' | 'SETTLED';

  @Column()
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
