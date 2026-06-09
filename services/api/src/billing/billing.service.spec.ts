import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const mockPrisma: any = {
  processedStripeEvent: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  subscription: {
    upsert: jest.fn().mockResolvedValue({}),
    findFirst: jest.fn(),
  },
  invoice: {
    upsert: jest.fn().mockResolvedValue({}),
  },
};

const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };

describe('BillingService — Stripe webhook idempotency', () => {
  let service: BillingService;
  let stripeMock: { webhooks: { constructEvent: jest.Mock } };

  beforeEach(async () => {
    // Set required env BEFORE creating BillingService.
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_dummy';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();
    service = module.get(BillingService);

    // Подменяем stripe для контролируемой подписи.
    stripeMock = {
      webhooks: { constructEvent: jest.fn() },
    };
    (service as unknown as { stripe: typeof stripeMock }).stripe = stripeMock;
    jest.clearAllMocks();
  });

  it('throws BadRequestException на невалидной подписи', async () => {
    stripeMock.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('Invalid signature');
    });
    await expect(
      service.handleWebhook(Buffer.from('{}'), 'bad-sig'),
    ).rejects.toThrow(BadRequestException);
  });

  it('skip-ит уже обработанный event (findUnique returns row)', async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue({
      id: 'evt_123',
      type: 'invoice.paid',
      data: { object: {} },
    });
    mockPrisma.processedStripeEvent.findUnique.mockResolvedValue({
      eventId: 'evt_123',
    });

    const result = await service.handleWebhook(Buffer.from('{}'), 'sig');
    expect(result).toEqual({ received: true, duplicate: true });
    // Handler не вызывался, INSERT тоже не нужен
    expect(mockPrisma.invoice.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.processedStripeEvent.create).not.toHaveBeenCalled();
  });

  it('CRITICAL — порядок: handler ПЕРЕД INSERT (recovery from crash)', async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue({
      id: 'evt_456',
      type: 'customer.subscription.created',
      data: {
        object: {
          metadata: { userId: 'user-1' },
          customer: 'cus_x',
          id: 'sub_x',
          status: 'active',
          current_period_start: 1700000000,
          current_period_end: 1702592000,
          items: { data: [{ price: { id: 'price_x' } }] },
        },
      },
    });
    mockPrisma.processedStripeEvent.findUnique.mockResolvedValue(null);
    mockPrisma.processedStripeEvent.create.mockResolvedValue({});

    const callOrder: string[] = [];
    mockPrisma.subscription.upsert.mockImplementation(async () => {
      callOrder.push('handler');
      return {};
    });
    mockPrisma.processedStripeEvent.create.mockImplementation(async () => {
      callOrder.push('insert');
      return {};
    });

    await service.handleWebhook(Buffer.from('{}'), 'sig');

    // Handler ОБЯЗАН вызваться до INSERT — иначе crash между ними теряет sync
    expect(callOrder).toEqual(['handler', 'insert']);
  });

  it('handler retry: P2002 при final INSERT не throws (другой воркер успел)', async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue({
      id: 'evt_789',
      type: 'invoice.paid',
      data: { object: { id: 'in_x', customer: 'cus_x', amount_paid: 1000 } },
    });
    mockPrisma.processedStripeEvent.findUnique.mockResolvedValue(null);
    // Handler upsert OK
    mockPrisma.subscription.findFirst.mockResolvedValue({
      id: 'sub-row',
      userId: 'user-1',
    });
    mockPrisma.invoice.upsert.mockResolvedValue({});
    // Final INSERT падает с P2002 — другой воркер уже успел
    const p2002 = Object.assign(new Error('Unique violation'), {
      code: 'P2002',
    });
    mockPrisma.processedStripeEvent.create.mockRejectedValue(p2002);

    const result = await service.handleWebhook(Buffer.from('{}'), 'sig');
    expect(result).toEqual({ received: true });
  });

  it('handler errors propagated (НЕ маркируем processed)', async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue({
      id: 'evt_error',
      type: 'customer.subscription.deleted',
      data: {
        object: {
          metadata: { userId: 'user-1' },
          id: 'sub_x',
          customer: 'cus_x',
          status: 'canceled',
          current_period_start: 1700000000,
          current_period_end: 1702592000,
          items: { data: [{ price: { id: 'price_x' } }] },
        },
      },
    });
    mockPrisma.processedStripeEvent.findUnique.mockResolvedValue(null);
    mockPrisma.subscription.upsert.mockRejectedValue(new Error('DB down'));

    await expect(
      service.handleWebhook(Buffer.from('{}'), 'sig'),
    ).rejects.toThrow('DB down');

    // Никакого INSERT — иначе Stripe не повторит при retry
    expect(mockPrisma.processedStripeEvent.create).not.toHaveBeenCalled();
  });
});
