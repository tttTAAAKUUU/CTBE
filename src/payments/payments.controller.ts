import {
  Controller,
  Post,
  Req,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { WalletsService } from '../wallet/wallet.service';
import { PayFastService } from './payfast.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Ensure this path is correct

@Controller('payments/payfast')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly walletsService: WalletsService,
    private readonly payfastService: PayFastService,
  ) {}

  @Post('init')
  @UseGuards(JwtAuthGuard) // Protect this so req.user is populated
  async initiate(@Req() req: any, @Body() body: { amount: number }) {
    this.logger.log(`Initiating PayFast deposit for user: ${req.user.id}`);
    
    // 1. Create a pending deposit in your DB
    const deposit = await this.walletsService.initiateDeposit(
      req.user,
      body.amount,
    );

    // 2. Generate the PayFast data object + Signature
    const paymentData = this.payfastService.getPaymentData(
      req.user,
      body.amount,
      deposit.reference, 
    );

    // 3. Return the data to frontend
    return {
      // PRO-TIP: Use 'https://sandbox.payfast.co.za/eng/process' while testing
      url: 'https://www.payfast.co.za/eng/process', 
      data: paymentData,
    };
  }

  @Post('itn')
  @HttpCode(HttpStatus.OK)
  async itn(@Body() body: any) {
    this.logger.log(`💳 PayFast ITN Received for Reference: ${body.m_payment_id}`);

    const isValid = this.payfastService.validateSignature(body);
    
    if (!isValid) {
      this.logger.error('❌ Invalid PayFast Signature received!');
      return { status: 'failed', message: 'Invalid Signature' };
    }

    if (body.payment_status === 'COMPLETE') {
      const amount = parseFloat(body.amount_gross);
      const reference = body.m_payment_id;

      await this.walletsService.completeDeposit(reference, amount);
      this.logger.log(`✅ Deposit ${reference} completed for $${amount}`);
    }

    return { status: 'received' };
  }
}