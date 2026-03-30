// backend/src/payments/payments.module.ts
import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PayFastService } from './payfast.service';
import { WalletModule } from '../wallet/wallet.module'; // Ensure this path is correct
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    WalletModule, // Needed to update user balances
  ],
  controllers: [PaymentsController],
  providers: [PayFastService],
  exports: [PayFastService],
})
export class PaymentsModule {}