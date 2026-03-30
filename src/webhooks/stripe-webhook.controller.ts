import { Controller, Post, Req, Headers, HttpCode } from '@nestjs/common';
import Stripe from 'stripe';
import { UsersService } from '../users/users.service';

@Controller('webhooks')
export class StripeWebhookController {
  private stripe: Stripe;

  constructor(private readonly usersService: UsersService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }

  @Post('stripe')
  @HttpCode(200)
  async handleStripeWebhook(
    @Req() req: any,
    @Headers('stripe-signature') signature: string,
  ) {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!,
      );
    } catch (err) {
      console.error('❌ Invalid Stripe webhook signature');
      return { received: false };
    }

    // ============================
    // HANDLE EVENTS
    // ============================
    switch (event.type) {
      case 'identity.verification_session.verified': {
        const session = event.data.object as Stripe.Identity.VerificationSession;
        const userId = Number(session.metadata?.userId);

        if (userId) {
          await this.usersService.setKycVerified(userId, true);
        }
        break;
      }

      case 'identity.verification_session.requires_input': {
        const session = event.data.object as Stripe.Identity.VerificationSession;
        const userId = Number(session.metadata?.userId);

        if (userId) {
          await this.usersService.setKycVerified(userId, false);
        }
        break;
      }

      default:
        // Ignore other events
        break;
    }

    return { received: true };
  }
}
