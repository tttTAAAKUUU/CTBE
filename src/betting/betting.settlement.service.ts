// src/betting/betting.settlement.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Bet } from './entities/bet.entity';
import { WalletsService } from '../wallet/wallet.service';
import { MarketsService } from '../markets/market.service';

@Injectable()
export class BettingSettlementService {
  private readonly logger = new Logger(BettingSettlementService.name);

  constructor(
    @InjectRepository(Bet)
    private readonly betRepo: Repository<Bet>,

    private readonly walletsService: WalletsService,
    private readonly marketsService: MarketsService,
  ) {}

  // Runs every minute
  @Cron(CronExpression.EVERY_MINUTE)
  async settleExpiredBets() {
    const now = new Date();

    const expiredBets = await this.betRepo.find({
      where: {
        status: 'OPEN',
        expiresAt: LessThan(now),
      },
      relations: ['user', 'market', 'entrySnapshot'],
    });

    if (expiredBets.length === 0) return;

    this.logger.log(`Found ${expiredBets.length} expired bets`);

    for (const bet of expiredBets) {
      try {
        await this.settleSingleBet(bet);
      } catch (err) {
        this.logger.error(
          `Failed to settle bet ${bet.id}`,
          err.stack,
        );
      }
    }
  }

  private async settleSingleBet(bet: Bet) {
    // Double safety check
    if (bet.status !== 'OPEN') return;

    const exitSnapshot =
      await this.marketsService.getLatestSnapshot(bet.market.id);

    const entryPrice = Number(bet.entrySnapshot.price);
    const exitPrice = Number(exitSnapshot.price);

    const won =
      (bet.direction === 'UP' && exitPrice > entryPrice) ||
      (bet.direction === 'DOWN' && exitPrice < entryPrice);

    const payout = won ? bet.stake * 2 : 0;

    await this.walletsService.unlockAndSettle(
      bet.user.id,
      bet.lockedAmount,
      payout,
    );

    bet.status = 'SETTLED';
    await this.betRepo.save(bet);

    this.logger.log(
      `Settled bet ${bet.id}, payout=${payout}`,
    );
  }
}
