// src/markets/price.cron.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MarketsService } from './market.service';
import { PriceEmpireClient } from './price-empire.client';

@Injectable()
export class PriceCron {
  private readonly logger = new Logger(PriceCron.name);

  constructor(
    private readonly marketsService: MarketsService,
    private readonly priceEmpire: PriceEmpireClient,
  ) {}

  /**
   * Runs every minute
   * Pulls prices
   * Stores snapshots
   */
  @Cron('* * * * *')
  async handlePriceSync() {
    const markets = await this.marketsService.getActiveMarkets();
    const prices = await this.priceEmpire.fetchPrices();

    for (const market of markets) {
      const match = prices.find(
        (p) => p.externalId === market.externalId,
      );

      if (!match) continue;

      await this.marketsService.recordPrice(
        market,
        match.price,
      );
    }

    this.logger.log(`Price sync complete`);
  }
}
