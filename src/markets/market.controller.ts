// backend/src/markets/markets.controller.ts
import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common'; // Added UseGuards
import { MarketsService } from './market.service';
import { AdminGuard } from '../auth/admin.guard'; // Adjust path based on your folder structure

@Controller('markets')
export class MarketsController {
  constructor(private readonly marketsService: MarketsService) {}

  @Get('discovery/volatile')
  @UseGuards(AdminGuard) 
  async getVolatile() {
    return await this.marketsService.getVolatileAssets(15);
  }

  @Get()
  async getMarkets() {
    return await this.marketsService.getAllMarkets();
  }

  @Get(':id/history')
  async getHistory(@Param('id', ParseIntPipe) id: number) {
    return await this.marketsService.getMarketHistory(id);
  }

  @Get(':id')
  async getMarket(@Param('id', ParseIntPipe) id: number) {
    return await this.marketsService.getMarket(id);
  }
}