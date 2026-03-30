// backend/src/positions/positions.controller.ts
import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PositionsService } from './position.service';
import { User } from '../users/entities/user/user.entity';

@Controller('positions')
@UseGuards(JwtAuthGuard)
export class PositionsController {
  constructor(private readonly positionsService: PositionsService) {}

  @Post()
  createPosition(@CurrentUser() user: User, @Body() dto: any) {
    return this.positionsService.openPosition(user, dto);
  }

  @Get('me')
  getMyPositions(@CurrentUser() user: User) {
    return this.positionsService.getMyOpenPositions(user);
  }

  @Post(':id/close')
  closePosition(@CurrentUser() user: User, @Param('id') id: string) {
    return this.positionsService.closePosition(user, Number(id));
  }
}