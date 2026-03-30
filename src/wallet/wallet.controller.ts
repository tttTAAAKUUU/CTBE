// backend/src/wallet/wallet.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { WalletsService } from './wallet.service';
import { User } from '../users/entities/user/user.entity';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get('me')
  getMyWallet(@CurrentUser() user: User) {
    return this.walletsService.getWallet(user.id);
  }

  @Get('transactions')
  getTransactions(@CurrentUser() user: User) {
    return this.walletsService.getTransactionHistory(user.id);
  }

  // ✅ TEMPORARY DEV ENDPOINT: To get past "Insufficient Funds"
  @Post('add-test-funds')
  addTestFunds(
    @CurrentUser() user: User,
    @Body('amount') amount: number,
  ) {
    return this.walletsService.addTestFunds(user.id, amount || 1000);
  }

  @Post('deposit')
  deposit(@CurrentUser() user: User, @Body('amount') amount: number) {
    return this.walletsService.initiateDeposit(user, amount);
  }

  @Post('withdraw')
  withdraw(@CurrentUser() user: User, @Body('amount') amount: number) {
    return this.walletsService.withdraw(user, amount);
  }
}