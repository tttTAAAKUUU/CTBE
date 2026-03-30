import { 
  Injectable, 
  Logger, 
  NotFoundException, 
  OnModuleInit 
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm'; 
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { Market } from './entities/market.entity';
import { MarketSnapshot } from './entities/market-snapshot.entity';
import { MarketsGateway } from './markets.gateway';
import axios from 'axios';

@Injectable()
export class MarketsService implements OnModuleInit {
  private readonly logger = new Logger(MarketsService.name);
  private readonly baseUrl = 'https://api.pricempire.com/v3';

  constructor(
    @InjectRepository(Market)
    private readonly marketRepo: Repository<Market>,
    @InjectRepository(MarketSnapshot)
    private readonly snapshotRepo: Repository<MarketSnapshot>,
    private configService: ConfigService,
    private readonly marketsGateway: MarketsGateway,
  ) {}

  async onModuleInit() {
    const marketCount = await this.marketRepo.count();
    const snapshotCount = await this.snapshotRepo.count();
    
    if (marketCount === 0) {
      await this.seedMarkets();
    } else if (snapshotCount === 0) {
      const markets = await this.marketRepo.find();
      for (const m of markets) {
        await this.recordPrice(m, m.currentPrice);
      }
    }
  }

  // --- RESTORED: Required by Controller ---
  async getAllMarkets(): Promise<Market[]> {
    return await this.marketRepo.find({ 
      order: { name: 'ASC' } 
    });
  }

  // --- RESTORED: Required by Betting and Positions ---
  async getLatestSnapshot(marketId: number): Promise<{ price: number; lastUpdated: Date }> {
    const market = await this.getMarket(marketId);
    
    const lastSnapshot = await this.snapshotRepo.findOne({
      where: { market: { id: marketId } },
      order: { createdAt: 'DESC' },
    });

    return {
      price: lastSnapshot ? Number(lastSnapshot.price) : Number(market.currentPrice),
      lastUpdated: lastSnapshot ? lastSnapshot.createdAt : new Date(),
    };
  }

  // --- RESTORED: Required by Controller for Charts ---
  async getMarketHistory(marketId: number) {
    const snapshots = await this.snapshotRepo.find({
      where: { market: { id: marketId } },
      order: { createdAt: 'ASC' }, 
      take: 500,
    });

    if (snapshots.length === 0) {
      const market = await this.getMarket(marketId);
      const today = new Date().toISOString().split('T')[0];
      return [{
        time: today,
        open: Number(market.currentPrice),
        high: Number(market.currentPrice),
        low: Number(market.currentPrice),
        close: Number(market.currentPrice)
      }];
    }

    const candles = new Map();
    snapshots.forEach((s) => {
      const date = new Date(s.createdAt).toISOString().split('T')[0];
      const price = Number(s.price);

      if (!candles.has(date)) {
        candles.set(date, { time: date, open: price, high: price, low: price, close: price });
      } else {
        const c = candles.get(date);
        c.high = Math.max(c.high, price);
        c.low = Math.min(c.low, price);
        c.close = price;
      }
    });

    return Array.from(candles.values());
  }

  async getActiveMarkets(): Promise<Market[]> {
    return await this.marketRepo.find({ 
      where: { active: true },
      order: { name: 'ASC' } 
    });
  }

  async syncTrendingFromPriceEmpire() {
    const apiKey = this.configService.get<string>('PRICE_EMPIRE_API_KEY');
    try {
      const response = await axios.get(`${this.baseUrl}/items/trending`, {
        params: { api_key: apiKey, source: 'buff' }
      });
      const items = response.data?.data || response.data;
      const results: Market[] = [];

      for (const item of items.slice(0, 12)) {
        const market = await this.marketRepo.save(
          this.marketRepo.create({
            name: item.market_hash_name.split('(')[0].trim(),
            marketHashName: item.market_hash_name,
            externalId: item.market_hash_name,
            symbol: 'HOT',
            currentPrice: (item.prices?.buff?.price || 0) / 100,
            active: true,
          })
        );
        await this.recordPrice(market, market.currentPrice);
        results.push(market);
      }
      return results;
    } catch (error: any) {
      this.logger.error(`❌ Trending Sync Failed: ${error.message}`);
      return [];
    }
  }

  async getVolatileAssets(limit: number = 10) {
    return this.marketRepo.createQueryBuilder('market')
      .leftJoin('market.snapshots', 'snapshots')
      .select([
        'market.id AS market_id',
        'market.name AS market_name',
        'market.currentPrice AS market_currentPrice',
        'STDDEV_SAMP(snapshots.price) AS volatility_score'
      ])
      .groupBy('market.id')
      .orderBy('volatility_score', 'DESC')
      .limit(limit)
      .getRawMany();
  }

  async seedMarkets() {
    const apiKey = this.configService.get<string>('PRICE_EMPIRE_API_KEY');
    if (!apiKey) return;

    try {
      const response = await axios.get(`${this.baseUrl}/items/prices`, {
        params: { api_key: apiKey, appId: 730, sources: 'buff' },
      });

      const items = response.data?.data || response.data;
      const allKeys = Object.keys(items);
      const marketEntities: Market[] = [];

      for (const key of allKeys) {
        if (marketEntities.length >= 50) break;
        const item = items[key];
        if (item?.buff?.price) {
          marketEntities.push(this.marketRepo.create({
            name: key.split('(')[0].trim(),
            marketHashName: key,
            externalId: key, 
            symbol: key.substring(0, 8).toUpperCase().replace(/[^A-Z]/g, ''),
            currentPrice: item.buff.price / 100,
            active: true,
          }));
        }
      }

      if (marketEntities.length > 0) {
        const saved = await this.marketRepo.save(marketEntities);
        for (const m of saved) {
          await this.recordPrice(m, m.currentPrice);
        }
      }
    } catch (error: any) {
      this.logger.error(`❌ Live Sync Failed: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async syncPrices() {
    const markets = await this.getActiveMarkets();
    if (markets.length === 0) return;

    try {
      const apiKey = this.configService.get<string>('PRICE_EMPIRE_API_KEY');
      const response = await axios.get(`${this.baseUrl}/items/prices`, {
        params: { api_key: apiKey, appId: 730, sources: 'buff' }
      });

      const items = response.data?.data || response.data;

      for (const market of markets) {
        const liveItem = items[market.marketHashName];
        if (liveItem?.buff?.price) {
          const newPrice = liveItem.buff.price / 100;
          if (Math.abs(newPrice - Number(market.currentPrice)) > 0.001) {
            market.currentPrice = newPrice;
            await this.marketRepo.save(market);
            await this.recordPrice(market, newPrice); 
            this.marketsGateway.server.emit('priceUpdate', { marketId: market.id, price: newPrice });
          }
        }
      }
    } catch (error: any) {
      this.logger.error(`❌ Sync Failed: ${error.message}`);
    }
  }

  async recordPrice(market: Market, price: number) {
    const snapshot = this.snapshotRepo.create({ market, price: Number(price), source: 'pricempire' });
    return await this.snapshotRepo.save(snapshot);
  }

  async getMarket(id: number): Promise<Market> {
    const market = await this.marketRepo.findOne({ where: { id } });
    if (!market) throw new NotFoundException(`Market with ID ${id} not found`);
    return market;
  }
}