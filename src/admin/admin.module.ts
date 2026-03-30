import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Competition } from '../competitions/entities/competition.entity';
import { Market } from '../markets/entities/market.entity';
import { AdminCompetitionController } from './admin-competition.controller';
import { AdminCompetitionService } from './admin-competition.service';

@Module({
  imports: [
    // Registers repositories for injection in AdminCompetitionService
    TypeOrmModule.forFeature([Competition, Market]),
  ],
  controllers: [AdminCompetitionController],
  providers: [AdminCompetitionService],
  exports: [AdminCompetitionService],
})
export class AdminModule {}