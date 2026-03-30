import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PriceEmpireService } from './price-empire.service';
import { Market } from '../markets/entities/market.entity';
import { MarketSnapshot } from '../markets/entities/market-snapshot.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Market, MarketSnapshot]),
  ],
  providers: [PriceEmpireService],
})
export class PriceEmpireModule {}
