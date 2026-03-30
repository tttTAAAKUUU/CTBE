// backend/src/competitions/competitions.controller.ts
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { CompetitionsService } from './competitions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../users/entities/user/user.entity';

@Controller('competitions')
export class CompetitionsController {
  constructor(private readonly compService: CompetitionsService) {}

  @Post()
  async create(@Body() createDto: any) {
    return await this.compService.create(createDto);
  }

  // --- EMERGENCY FIX ENDPOINT ---
  @Post(':id/fix-assets')
  async fixAssets(@Param('id') id: string) {
    return await this.compService.emergencyFixAssets(+id);
  }

  @Post('seed')
  async seed() {
    return await this.compService.seedDummyData();
  }

  @Get()
  async getAll() {
    return await this.compService.findAllActive();
  }

  @Get(':id/leaderboard')
  async getLeaderboard(@Param('id') id: string) {
    return await this.compService.getLeaderboard(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/join')
  async join(@Param('id') id: string, @CurrentUser() user: User) {
    return await this.compService.joinCompetition(+id, user);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return await this.compService.findOne(+id);
  }
}