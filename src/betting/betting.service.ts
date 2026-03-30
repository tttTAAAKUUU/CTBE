// src/betting/betting.service.ts
import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Position } from '../positions/position.entity';
import { WalletsService } from '../wallet/wallet.service';
import { MarketsService } from '../markets/market.service';
import { User } from '../users/entities/user/user.entity';
import { Bet } from './entities/bet.entity';


// src/betting/betting.service.ts
@Injectable()
export class BettingService {
  constructor(
    @InjectRepository(Bet)
    private readonly betRepo: Repository<Bet>,
    private readonly walletsService: WalletsService,
    private readonly marketsService: MarketsService,
  ) {}

  // =========================
  // PLACE BET
  // =========================
  async placeBet(
    user: User,
    marketId: number,
    stake: number,
    direction: 'UP' | 'DOWN',
    durationSeconds: number,
  ) {
    if (user.kycStatus !== 'approved') {
      throw new ForbiddenException('KYC not approved');
    }

    if (stake <= 0) {
      throw new BadRequestException('Invalid stake');
    }

    const market = await this.marketsService.getMarket(marketId);
    if (!market.active) {
      throw new BadRequestException('Market inactive');
    }

    const snapshot =
      await this.marketsService.getLatestSnapshot(marketId);

    // 🔒 lock wallet funds
    await this.walletsService.lockFunds(user.id, stake);

    const expiresAt = new Date(
      Date.now() + durationSeconds * 1000,
    );

    const bet = this.betRepo.create({
      user,
      market,
      entrySnapshot: snapshot,
      stake,
      lockedAmount: stake,
      direction,
      status: 'OPEN',
      expiresAt,
    });

    return this.betRepo.save(bet);
  }

  // =========================
  // SETTLE SINGLE BET
  // =========================
  async settleBet(bet: Bet) {
    const exitSnapshot =
      await this.marketsService.getLatestSnapshot(
        bet.market.id,
      );

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
  }
}
