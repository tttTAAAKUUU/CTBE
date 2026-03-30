// src/betting/betting.cron.ts
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Bet } from './entities/bet.entity';
import { BettingService } from './betting.service';

@Injectable()
export class BettingCron {
  constructor(
    @InjectRepository(Bet)
    private readonly betRepo: Repository<Bet>,
    private readonly bettingService: BettingService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async settleExpiredBets() {
    const now = new Date();

    const expiredBets = await this.betRepo.find({
      where: {
        status: 'OPEN',
        expiresAt: LessThan(now),
      },
      relations: ['user', 'market', 'entrySnapshot'],
    });

    for (const bet of expiredBets) {
      await this.bettingService.settleBet(bet);
    }
  }
}
