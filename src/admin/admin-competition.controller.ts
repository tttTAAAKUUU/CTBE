import { 
  Controller, 
  Post, 
  Get, 
  Patch, 
  Body, 
  Param, 
  Query, 
  ParseIntPipe, 
  ParseFloatPipe 
} from '@nestjs/common';
import { AdminCompetitionService, PayoutLevel } from './admin-competition.service';

@Controller('admin')
export class AdminCompetitionController {
  constructor(private readonly adminService: AdminCompetitionService) {}

  /**
   * GLOBAL STATS -> GET /admin/stats
   */
  @Get('stats')
  async getDashboardStats() {
    return this.adminService.getAdminStats();
  }

  /**
   * PAYOUT PREVIEW -> GET /admin/payouts/preview
   */
  @Get('payouts/preview')
  getPreview(
    @Query('pool', ParseFloatPipe) pool: number,
    @Query('winners', ParseIntPipe) winners: number,
  ): PayoutLevel[] {
    return this.adminService.calculatePayoutDistribution(pool, winners);
  }

  /**
   * CREATE COMPETITION -> POST /admin/competitions
   */
  @Post('competitions')
  async createCompetition(@Body() createDto: any) {
    return this.adminService.createCompetition(createDto);
  }

  /**
   * ASSET TOGGLE -> PATCH /admin/assets/:id/toggle
   */
  @Patch('assets/:id/toggle')
  async toggleAsset(
    @Param('id', ParseIntPipe) id: number,
    @Body('active') active: boolean,
  ) {
    return this.adminService.toggleAssetGlobalAvailability(id, active);
  }
}