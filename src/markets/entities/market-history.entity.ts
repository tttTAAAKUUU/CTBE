import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity()
export class MarketHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Index() // Indexing the name makes lookups for indicators lightning fast
  @Column()
  marketHashName: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @CreateDateColumn()
  timestamp: Date;
}