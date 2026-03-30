import {
  Controller,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { BettingService } from './betting.service';
import { User } from '../users/entities/user/user.entity';

@Controller('bets')
@UseGuards(JwtAuthGuard)
export class BettingController {
  constructor(
    private readonly bettingService: BettingService,
  ) {}

  @Post()
placeBet(
  @CurrentUser() user: User,
  @Body()
  body: {
    marketId: number;
    stake: number;
    direction: 'UP' | 'DOWN';
    durationSeconds: number;
  },
) {
  return this.bettingService.placeBet(
    user,
    body.marketId,
    body.stake,
    body.direction,
    body.durationSeconds,
  );
}

}
