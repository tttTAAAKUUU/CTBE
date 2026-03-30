import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Market } from '../markets/entities/market.entity';
import { MarketSnapshot } from '../markets/entities/market-snapshot.entity';

@Injectable()
export class PriceEmpireService {
  constructor(
    @InjectRepository(Market)
    private readonly marketRepo: Repository<Market>,

    @InjectRepository(MarketSnapshot)
    private readonly priceRepo: Repository<MarketSnapshot>,
  ) {}

  // runs every minute
  @Cron('*/60 * * * * *')
  async pollPrices() {
    const res = await axios.get(
      'https://api.pricempire.com/v2/items',
    );

    for (const item of res.data.items) {
      const market = await this.marketRepo.findOne({
        where: { externalId: item.id },
      });

      const activeMarket =
        market ??
        (await this.marketRepo.save(
          this.marketRepo.create({
            externalId: item.id,
            name: item.name,
            symbol: item.market_hash_name,
          }),
        ));

      await this.priceRepo.save(
        this.priceRepo.create({
          market: activeMarket,
          price: item.prices.steam.last_24h,
        }),
      );
    }
  }
}
