import {
  Controller,
  Post,
  Req,
  Headers,
  HttpCode,
} from '@nestjs/common';
import { KycService } from './kyc.service';
import Stripe from 'stripe';

@Controller('webhooks/stripe')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Post()
  @HttpCode(200)
  async handleStripeWebhook(
    @Req() req,
    @Headers('stripe-signature') signature: string,
  ) {
    /**
     * Stripe sends the RAW body
     * DO NOT JSON.parse it
     */
    const rawBody = req.body;

    let event: Stripe.Event;

    event = this.kycService.verifyWebhook(rawBody, signature);

    /**
     * We only react to identity events
     */
    switch (event.type) {
      case 'identity.verification_session.verified':
        await this.kycService.handleVerified(event);
        break;

      case 'identity.verification_session.requires_input':
      case 'identity.verification_session.canceled':
        await this.kycService.handleRejected(event);
        break;

      default:
        // ignore noise
        break;
    }

    return { received: true };
  }
}
