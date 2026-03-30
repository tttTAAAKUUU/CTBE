import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class PayFastService {
  private readonly logger = new Logger(PayFastService.name);

  constructor(private configService: ConfigService) {}

  /**
   * Generates the MD5 signature required by PayFast.
   * Works for both outgoing requests and incoming ITN validation.
   */
  generateSignature(data: any): string {
    const passphrase = this.configService.get<string>('PAYFAST_PASSPHRASE');
    
    // 1. Create parameter string (excluding signature itself)
    let getString = "";
    Object.keys(data).forEach(key => {
      if (data[key] !== "" && key !== 'signature') {
        // PayFast requires URL encoding with + for spaces
        getString += `${key}=${encodeURIComponent(data[key].toString().trim()).replace(/%20/g, "+")}&`;
      }
    });

    // 2. Remove the trailing ampersand and append passphrase
    let finalString = getString.slice(0, -1);
    if (passphrase) {
      finalString += `&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, "+")}`;
    }

    // 3. Generate MD5 Hash
    return crypto.createHash('md5').update(finalString).digest('hex');
  }

  /**
   * Validates the signature sent by PayFast in the ITN callback.
   */
  validateSignature(data: any): boolean {
    const receivedSignature = data.signature;
    
    // Clone the data object so we don't mutate the original request body
    const payload = { ...data };
    
    // The signature itself must be excluded from the calculation
    delete payload.signature;

    const calculatedSignature = this.generateSignature(payload);
    
    const isValid = receivedSignature === calculatedSignature;
    
    if (!isValid) {
      this.logger.error(`Signature Mismatch! Received: ${receivedSignature}, Calculated: ${calculatedSignature}`);
    }

    return isValid;
  }

  /**
   * Formats data for the initial POST to PayFast.
   */
  getPaymentData(user: any, amount: number, reference: string) {
    const isSandbox = this.configService.get('NODE_ENV') !== 'production';
    
    const data: any = {
      // Use Sandbox IDs if not in production
      merchant_id: this.configService.get('PAYFAST_MERCHANT_ID'),
      merchant_key: this.configService.get('PAYFAST_MERCHANT_KEY'),
      return_url: `${this.configService.get('FRONTEND_URL')}/dashboard/wallet?status=success`,
      cancel_url: `${this.configService.get('FRONTEND_URL')}/dashboard/wallet?status=cancel`,
      notify_url: `${this.configService.get('BACKEND_URL')}/payments/payfast/itn`,
      name_first: user.username || 'User',
      email_address: user.email,
      m_payment_id: reference, 
      amount: amount.toFixed(2),
      item_name: 'Wallet Deposit - ClutchTrades',
    };

    data.signature = this.generateSignature(data);
    return data;
  }
}