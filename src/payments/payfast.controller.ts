// backend/src/payments/payfast.controller.ts
import { Controller, Post, Body, Req } from '@nestjs/common';

@Controller('payments/payfast')
export class PayFastController {
  
  @Post('notify')
  async handleITN(@Body() data: any) {
    // PayFast sends an ITN (Instant Transaction Notification) here
    // 1. Verify the signature (MD5)
    // 2. Check if payment_status === 'COMPLETE'
    // 3. Credit the user's wallet
    console.log('Payment Received:', data);
    return { status: 'OK' };
  }
}