import { BadRequestException } from '@nestjs/common';
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import Stripe from 'stripe';
import { UsersService } from '../users/users.service';

@Injectable()
export class KycService {
  private stripe: Stripe;

  constructor(@Inject(forwardRef(() => UsersService)) private readonly usersService: UsersService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }

  // =========================
  // CREATE VERIFICATION SESSION
  // =========================
  async createKycSession(user) {
    return this.stripe.identity.verificationSessions.create({
      type: 'document',
      metadata: {
        userId: user.id.toString(),
      },
    });
  }

  // =========================
  // VERIFY WEBHOOK
  // =========================
  verifyWebhook(rawBody: Buffer, signature: string): Stripe.Event {
    try {
      return this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!,
      );
    } catch (err) {
      throw new BadRequestException('Invalid Stripe signature');
    }
  }

  // =========================
  // HANDLE APPROVED KYC
  // =========================
  async handleVerified(event: Stripe.Event) {
    const session = event.data.object as Stripe.Identity.VerificationSession;
    const userId = Number(session.metadata.userId);

    await this.usersService.setKycVerified(userId, true);
  }

  // =========================
  // HANDLE REJECTED KYC
  // =========================
  async handleRejected(event: Stripe.Event) {
    const session = event.data.object as Stripe.Identity.VerificationSession;
    const userId = Number(session.metadata.userId);

    await this.usersService.setKycVerified(userId, false);
  }
}
