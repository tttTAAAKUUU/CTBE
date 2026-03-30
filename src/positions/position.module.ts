import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Position } from './position.entity';
import { PositionsService } from './position.service';
import { PositionsController } from './position.controller';
import { MarketsModule } from '../markets/market.module';
import { WalletModule } from '../wallet/wallet.module';
import { PositionsCron } from './position.cron';
import { AuthModule } from '../auth/auth.module'; // 👈 Import your AuthModule

@Module({
  imports: [
    TypeOrmModule.forFeature([Position]),
    MarketsModule,
    WalletModule,
    AuthModule, // 👈 ADD THIS HERE
  ],
  providers: [PositionsService, PositionsCron],
  controllers: [PositionsController],
  exports: [PositionsService, TypeOrmModule],
})
export class PositionsModule {}