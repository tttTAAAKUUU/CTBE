import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Market } from './entities/market.entity';
import { MarketSnapshot } from './entities/market-snapshot.entity';
import { MarketsService } from './market.service';
import { MarketsGateway } from './markets.gateway';
import { MarketsController } from './market.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Market, MarketSnapshot]),
  ],
  controllers: [MarketsController],
  providers: [
    MarketsService, 
    MarketsGateway
  ],
  exports: [MarketsService],
})
export class MarketsModule {}