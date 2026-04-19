import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

/**
 * BillingService (#145).
 *
 * Обёртка вокруг Stripe SDK. Ленивая инициализация, чтобы сервис
 * стартовал даже без Stripe credentials (dev mode).
 *
 * Продакшен-setup — см. инструкции Вики в issue #145.
 */

export interface PlanConfig {
  id: string;
  name: string;
  stripePriceId?: string; // заполняется после Stripe setup
  priceCentsMonthly: number;
  features: string[];
  role: 'PATIENT' | 'THERAPIST';
}

export const PLANS: PlanConfig[] = [
  {
    id: 'FREE',
    name: 'Free',
    priceCentsMonthly: 0,
    role: 'PATIENT',
    features: ['3 sessions per month', 'Basic BLS patterns', 'No AI dialogue'],
  },
  {
    id: 'PATIENT_BASIC',
    name: 'Patient Basic',
    priceCentsMonthly: 1900,
    role: 'PATIENT',
    features: [
      'Unlimited sessions',
      'AI dialogue',
      'Full BLS pattern library',
      'Progress tracking',
    ],
  },
  {
    id: 'PATIENT_PREMIUM',
    name: 'Patient Premium',
    priceCentsMonthly: 4900,
    role: 'PATIENT',
    features: [
      'Everything in Basic',
      'Session recording & transcripts',
      'Therapist connection',
      'Priority support',
    ],
  },
  {
    id: 'THERAPIST_PRO',
    name: 'Therapist Pro',
    priceCentsMonthly: 9900,
    role: 'THERAPIST',
    features: [
      'Unlimited patients',
      'Session notes & supervision',
      'Analytics dashboard',
      'HIPAA BAA included',
    ],
  },
];

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private stripe: any = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (key) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Stripe = require('stripe');
      this.stripe = new Stripe(key, { apiVersion: '2024-12-18.acacia' });
    } else {
      this.logger.warn('STRIPE_SECRET_KEY not set — billing endpoints will return 503');
    }
  }

  private assertStripe() {
    if (!this.stripe) {
      throw new ServiceUnavailableException(
        'Billing not configured. Set STRIPE_SECRET_KEY.',
      );
    }
  }

  getPlans(): PlanConfig[] {
    return PLANS;
  }

  async getOrCreateCustomer(userId: string): Promise<string> {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    if (sub?.stripeCustomerId) return sub.stripeCustomerId;

    this.assertStripe();
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const customer = await this.stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: user.id },
    });

    await this.prisma.subscription.upsert({
      where: { userId },
      update: { stripeCustomerId: customer.id },
      create: {
        userId,
        stripeCustomerId: customer.id,
        plan: 'FREE',
        status: 'ACTIVE',
      },
    });

    return customer.id;
  }

  async createCheckoutSession(userId: string, planId: string) {
    this.assertStripe();
    const plan = PLANS.find((p) => p.id === planId);
    if (!plan || !plan.stripePriceId) {
      throw new NotFoundException(
        'Plan not found or Stripe price ID not configured',
      );
    }

    const customerId = await this.getOrCreateCustomer(userId);
    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/billing/cancel`,
      subscription_data: {
        trial_period_days: 14,
      },
      metadata: { userId, planId },
    });

    await this.audit.log({
      userId,
      actorId: userId,
      action: 'CHECKOUT_SESSION_CREATED',
      resourceType: 'Subscription',
      details: { planId, sessionId: session.id },
    });

    return { checkoutUrl: session.url };
  }

  async createPortalSession(userId: string) {
    this.assertStripe();
    const customerId = await this.getOrCreateCustomer(userId);
    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';

    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/settings/billing`,
    });

    return { portalUrl: session.url };
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    this.assertStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new ServiceUnavailableException(
        'STRIPE_WEBHOOK_SECRET not configured',
      );
    }

    let event: any;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (err) {
      this.logger.warn(`Webhook signature verification failed: ${err}`);
      throw new ServiceUnavailableException('Invalid signature');
    }

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await this.syncSubscriptionFromEvent(event.data.object);
        break;
      case 'invoice.paid':
      case 'invoice.payment_failed':
        await this.syncInvoiceFromEvent(event.data.object);
        break;
      default:
        this.logger.debug(`Unhandled webhook event: ${event.type}`);
    }

    return { received: true };
  }

  private async syncSubscriptionFromEvent(sub: any) {
    const userId = sub.metadata?.userId;
    if (!userId) return;

    const plan = PLANS.find((p) => p.stripePriceId === sub.items?.data?.[0]?.price?.id);

    await this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        stripeCustomerId: sub.customer,
        stripeSubscriptionId: sub.id,
        plan: plan?.id ?? 'UNKNOWN',
        status: sub.status.toUpperCase(),
        currentPeriodStart: sub.current_period_start
          ? new Date(sub.current_period_start * 1000)
          : null,
        currentPeriodEnd: sub.current_period_end
          ? new Date(sub.current_period_end * 1000)
          : null,
        cancelAtPeriodEnd: !!sub.cancel_at_period_end,
      },
      update: {
        stripeSubscriptionId: sub.id,
        plan: plan?.id ?? undefined,
        status: sub.status.toUpperCase(),
        currentPeriodStart: sub.current_period_start
          ? new Date(sub.current_period_start * 1000)
          : null,
        currentPeriodEnd: sub.current_period_end
          ? new Date(sub.current_period_end * 1000)
          : null,
        cancelAtPeriodEnd: !!sub.cancel_at_period_end,
      },
    });

    await this.audit.log({
      userId,
      action: 'SUBSCRIPTION_SYNC',
      resourceType: 'Subscription',
      details: { status: sub.status, plan: plan?.id },
    });
  }

  private async syncInvoiceFromEvent(invoice: any) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { stripeCustomerId: invoice.customer },
    });
    if (!subscription) return;

    await this.prisma.invoice.upsert({
      where: { stripeInvoiceId: invoice.id },
      create: {
        subscriptionId: subscription.id,
        stripeInvoiceId: invoice.id,
        amountCents: invoice.amount_paid || invoice.amount_due,
        currency: invoice.currency,
        status: invoice.status?.toUpperCase() ?? 'UNKNOWN',
        hostedInvoiceUrl: invoice.hosted_invoice_url,
        pdfUrl: invoice.invoice_pdf,
        paidAt: invoice.status === 'paid' ? new Date() : null,
      },
      update: {
        status: invoice.status?.toUpperCase(),
        paidAt: invoice.status === 'paid' ? new Date() : null,
      },
    });
  }

  async getSubscription(userId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { invoices: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
    return sub ?? { plan: 'FREE', status: 'ACTIVE', invoices: [] };
  }
}
