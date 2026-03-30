import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Competition } from '../competitions/entities/competition.entity';
import { Market } from '../markets/entities/market.entity';

// Define the structure for the payout preview
export interface PayoutLevel {
  rank: number;
  amount: number;
  percentage: string;
}

@Injectable()
export class AdminCompetitionService {
  private readonly logger = new Logger(AdminCompetitionService.name);

  constructor(
    @InjectRepository(Competition)
    private compRepo: Repository<Competition>,
    @InjectRepository(Market)
    private marketRepo: Repository<Market>,
  ) {}

  /**
   * Calculates a "Dribble" Payout using a decay curve.
   * Decay ensures 1st place gets the most, tapering down to the last winner.
   */
  calculatePayoutDistribution(prizePool: number, winnersCount: number): PayoutLevel[] {
    const distribution: PayoutLevel[] = [];
    let remaining = Number(prizePool);
    
    // Safety check for invalid inputs
    if (prizePool <= 0 || winnersCount <= 0) return [];

    /**
     * Exponential decay factor. 
     * Higher = steeper drop-off for lower ranks.
     */
    const decayFactor = 0.4; 

    for (let i = 1; i <= winnersCount; i++) {
      let prize: number;
      
      if (i === winnersCount) {
        prize = remaining; // Ensure the last cent is allocated
      } else {
        // Calculate share based on remaining pool
        prize = remaining * decayFactor;
      }

      distribution.push({
        rank: i,
        amount: parseFloat(prize.toFixed(2)),
        percentage: ((prize / prizePool) * 100).toFixed(1) + '%',
      });

      remaining -= prize;
      
      // Stop if we run out of money before running out of winner slots
      if (remaining <= 0.01) break; 
    }

    return distribution;
  }

  /**
   * Emergency Kill-Switch for a specific asset
   */
  async toggleAssetGlobalAvailability(marketId: number, status: boolean) {
    this.logger.warn(`Admin toggling Market ${marketId} to ${status ? 'ACTIVE' : 'DISABLED'}`);
    // Ensure your Market entity has an 'active' or 'isActive' field
    return this.marketRepo.update(marketId, { active: status });
  }

  /**
   * Saves new competition to database
   */
  async createCompetition(data: any) {
    this.logger.log(`Creating competition: ${data.name || data.title}`);
    const competition = this.compRepo.create(data);
    return this.compRepo.save(competition);
  }

  /**
   * Fetches stats for the Admin Dashboard Overview
   */
  async getAdminStats() {
    try {
      // PostgreSQL SUM often returns a string, so we cast it
      const totalPrizeResult = await this.compRepo
        .createQueryBuilder('comp')
        .select('SUM(comp.prizePool)', 'total')
        .where('comp.status = :status', { status: 'active' })
        .getRawOne();

      const activeCount = await this.compRepo.count({ 
        where: { status: 'active' } 
      });

      return {
        activeCompetitions: activeCount,
        totalPrizeLocked: parseFloat(totalPrizeResult?.total || '0'),
      };
    } catch (error) {
      this.logger.error('Failed to fetch admin stats', error.stack);
      return { activeCompetitions: 0, totalPrizeLocked: 0 };
    }
  }
}