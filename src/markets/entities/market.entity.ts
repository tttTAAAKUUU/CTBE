import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class Market {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  externalId: string;

  @Column()
  name: string;

  @Column()
  marketHashName: string;

  @Column()
  symbol: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  currentPrice: number; // 👈 Add this

  @UpdateDateColumn()
  lastUpdated: Date; // 👈 Add this

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;
}