// backend/src/positions/positions.service.ts
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Position } from './position.entity';
import { MarketsService } from '../markets/market.service';
import { WalletsService } from '../wallet/wallet.service';
import { User } from '../users/entities/user/user.entity';

@Injectable()
export class PositionsService {
  constructor(
    @InjectRepository(Position)
    private readonly positionRepo: Repository<Position>,
    private readonly marketsService: MarketsService,
    private readonly walletsService: WalletsService,
  ) {}

  // =========================
  // USER ACTIONS
  // =========================

  async openPosition(user: User, dto: { competitionId: number; marketId: number; type: 'LONG' | 'SHORT'; stake: number }) {
    const snapshot = await this.marketsService.getLatestSnapshot(dto.marketId);
    if (!snapshot) throw new NotFoundException('Market data unavailable');

    const stakeAmount = Number(dto.stake);
    if (isNaN(stakeAmount) || stakeAmount <= 0) throw new BadRequestException('Invalid stake amount');

    // Deduct/Lock funds from user wallet
    await this.walletsService.lockFunds(user.id, stakeAmount); 

    const position = this.positionRepo.create({
      user,
      side: dto.type,
      stake: stakeAmount,
      entryPrice: Number(snapshot.price),
      market: { id: dto.marketId } as any,
      competition: { id: dto.competitionId } as any,
      status: 'OPEN',
      openedAt: new Date(),
    });

    return this.positionRepo.save(position);
  }

  async getMyOpenPositions(user: User) {
    return this.positionRepo.find({
      where: { user: { id: user.id }, status: 'OPEN' },
      relations: ['market'],
      order: { openedAt: 'DESC' },
    });
  }

  async closePosition(user: User, positionId: number, exitPriceOverride?: number) {
    const position = await this.positionRepo.findOne({
      where: { id: positionId, user: { id: user.id } },
      relations: ['user', 'market'],
    });

    if (!position || position.status !== 'OPEN') throw new BadRequestException('Position not found or already closed');

    // Use override (from Cron) or get latest from DB
    const snapshotPrice = exitPriceOverride ?? 
      (await this.marketsService.getLatestSnapshot(position.market.id)).price;

    const exitPrice = Number(snapshotPrice);
    const entryPrice = Number(position.entryPrice);

    const pnl = position.side === 'LONG'
      ? position.stake * ((exitPrice - entryPrice) / entryPrice)
      : position.stake * ((entryPrice - exitPrice) / entryPrice);

    const payout = Math.max(0, position.stake + pnl);

    // Finalize wallet transaction
    await this.walletsService.unlockAndSettle(user.id, position.stake, payout);

    position.exitPrice = exitPrice;
    position.status = 'CLOSED';
    position.closedAt = new Date();

    return this.positionRepo.save(position);
  }

  // =========================
  // CRON JOB HELPERS
  // =========================

  async getOpenPositions() {
    return this.positionRepo.find({
      where: { status: 'OPEN' },
      relations: ['user', 'market'],
    });
  }

  async evaluateAutoClose(position: Position, currentPrice: number) {
    if (position.status !== 'OPEN') return false;

    // Optional: Update trailing stop if implemented in Entity
    this.updateTrailingStop(position, currentPrice);

    if (position.side === 'LONG') {
      if ((position.stopLoss && currentPrice <= position.stopLoss) ||
          (position.takeProfit && currentPrice >= position.takeProfit)) {
        return true;
      }
    } else if (position.side === 'SHORT') {
      if ((position.stopLoss && currentPrice >= position.stopLoss) ||
          (position.takeProfit && currentPrice <= position.takeProfit)) {
        return true;
      }
    }
    return false;
  }

  private updateTrailingStop(position: Position, currentPrice: number): boolean {
    if (!position.trailingPercent) return false;
    const trailingFactor = position.trailingPercent / 100;

    if (position.side === 'LONG') {
      if (!position.bestPrice || currentPrice > position.bestPrice) {
        position.bestPrice = currentPrice;
        position.stopLoss = currentPrice - (currentPrice * trailingFactor);
        return true;
      }
    } else {
      if (!position.bestPrice || currentPrice < position.bestPrice) {
        position.bestPrice = currentPrice;
        position.stopLoss = currentPrice + (currentPrice * trailingFactor);
        return true;
      }
    }
    return false;
  }
}