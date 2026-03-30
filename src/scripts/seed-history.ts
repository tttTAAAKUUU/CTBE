import { DataSource } from 'typeorm';
import { MarketSnapshot } from '../../src/markets/entities/market-snapshot.entity';
import { Market } from '../../src/markets/entities/market.entity';

export async function seedVolatileHistory(dataSource: DataSource, marketId: number) {
  const snapshotRepo = dataSource.getRepository(MarketSnapshot);
  const marketRepo = dataSource.getRepository(Market);

  const market = await marketRepo.findOneBy({ id: Number(marketId) });
  if (!market) throw new Error("Market not found");

  let lastPrice = Number(market.currentPrice) || 25.86;
  const entries: MarketSnapshot[] = []; 
  const now = new Date();

  console.log(`📊 Generating 50 volatile snapshots for ${market.name}...`);

  for (let i = 50; i > 0; i--) {
    const changePercent = (Math.random() - 0.5) * 0.08; // Increased for better visuals
    const close = lastPrice * (1 + changePercent);
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);

    const snapshot = snapshotRepo.create({
      market: market,
      price: Number(close.toFixed(2)),
      source: 'seed_volatile',
      createdAt: timestamp,
    });

    entries.push(snapshot);
    lastPrice = close;
  }

  await snapshotRepo.save(entries);
  console.log("✅ Seeded successfully. Volatility should now appear in Admin Dash.");
}