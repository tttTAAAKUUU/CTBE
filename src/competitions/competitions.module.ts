// backend/src/competitions/competitions.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Competition } from './entities/competition.entity';
import { CompetitionsService } from './competitions.service';
import { CompetitionsController } from './competitions.controller';
import { Market } from '../markets/entities/market.entity'; 
import { WalletModule } from '../wallet/wallet.module';
import { AuthModule } from '../auth/auth.module'; // ✅ Import AuthModule

@Module({
  imports: [
    TypeOrmModule.forFeature([Competition, Market]),
    forwardRef(() => WalletModule),
    AuthModule, // ✅ Add this here to resolve JwtService
  ],
  providers: [CompetitionsService],
  controllers: [CompetitionsController],
  exports: [CompetitionsService],
})
export class CompetitionsModule {}