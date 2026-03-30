// src/betting/betting.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bet } from './entities/bet.entity';
import { BettingService } from './betting.service';
import { BettingSettlementService } from './betting.settlement.service';
import { WalletModule } from '../wallet/wallet.module';
import { MarketsModule } from '../markets/market.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Bet]),
    WalletModule,
    MarketsModule,
  ],
  providers: [
    BettingService,
    BettingSettlementService, // 👈 IMPORTANT
  ],
})
export class BettingModule {}
