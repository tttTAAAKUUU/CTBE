// src/competitions/entities/competition.entity.ts
import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  OneToMany, 
  CreateDateColumn, 
  ManyToMany, 
  JoinTable 
} from 'typeorm';
import { Position } from '../../positions/position.entity';
import { Market } from '../../markets/entities/market.entity';
import { User } from '../../users/entities/user/user.entity'; // ✅ Import User

@Entity()
export class Competition {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  prizePool: number;

  @Column({ default: 'active' })
  status: 'active' | 'upcoming' | 'finished';

  @Column({ type: 'timestamptz' })
  startsAt: Date;

  @Column({ type: 'timestamptz' })
  endsAt: Date;

  @Column({ default: 100 })
  maxParticipants: number;

  @OneToMany(() => Position, (position) => position.competition)
  positions: Position[];

  @ManyToMany(() => Market)
  @JoinTable({ name: 'competition_markets' }) // Naming the join table explicitly
  allowedAssets: Market[];

  // ✅ NEW: Track users who joined this competition
  @ManyToMany(() => User, (user) => user.joinedCompetitions)
  @JoinTable({ name: 'competition_participants' })
  participants: User[];

  @CreateDateColumn()
  createdAt: Date;
}