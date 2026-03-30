// src/markets/entities/price-snapshot.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Market } from './market.entity';

@Entity()
@Index(['market', 'createdAt'])
export class MarketSnapshot {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Market)
  market: Market;

  @Column('decimal', { precision: 12, scale: 2 })
  price: number;

  @Column()
  source: string;

  @CreateDateColumn()
  createdAt: Date;
}
