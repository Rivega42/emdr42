import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
}));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const webpush = require('web-push');

const mockPrisma: any = {
  user: { findUnique: jest.fn() },
  pushSubscription: {
    findMany: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
};

const mockEmail = {
  sendWelcome: jest.fn(),
  sendSessionReminder: jest.fn(),
  sendWeeklyReport: jest.fn(),
  sendCrisisAlertToTherapist: jest.fn(),
};

describe('NotificationsService (#234 web-push)', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmailService, useValue: mockEmail },
      ],
    }).compile();
    service = module.get(NotificationsService);
    jest.clearAllMocks();
    process.env.VAPID_PUBLIC_KEY = 'pub';
    process.env.VAPID_PRIVATE_KEY = 'priv';
    process.env.VAPID_SUBJECT = 'mailto:test@emdr42.local';
  });

  afterAll(() => {
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;
  });

  it('subscribe — upsert по endpoint', async () => {
    mockPrisma.pushSubscription.upsert.mockResolvedValue({ id: 'ps1' });
    await service.subscribe(
      'u1',
      { endpoint: 'https://push/abc', keys: { p256dh: 'k1', auth: 'a1' } },
      'UA',
    );
    expect(mockPrisma.pushSubscription.upsert).toHaveBeenCalledWith({
      where: { endpoint: 'https://push/abc' },
      update: { userId: 'u1', p256dh: 'k1', auth: 'a1', userAgent: 'UA' },
      create: expect.objectContaining({ userId: 'u1', endpoint: 'https://push/abc' }),
    });
  });

  it('push уходит во все подписки пользователя', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      isActive: true,
      deletedAt: null,
      settings: { notifications: { email: false, push: true } },
    });
    mockPrisma.pushSubscription.findMany.mockResolvedValue([
      { id: 'ps1', endpoint: 'e1', p256dh: 'k', auth: 'a' },
      { id: 'ps2', endpoint: 'e2', p256dh: 'k', auth: 'a' },
    ]);
    (webpush.sendNotification as jest.Mock).mockResolvedValue({});

    await service.notify({ type: 'session_reminder', userId: 'u1', data: {} });

    expect(webpush.sendNotification).toHaveBeenCalledTimes(2);
    // Контент без PHI
    const body = (webpush.sendNotification as jest.Mock).mock.calls[0][1];
    expect(body).not.toContain('SUDS');
  });

  it('410 от push-сервиса → протухшая подписка удаляется', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      isActive: true,
      deletedAt: null,
      settings: { notifications: { email: false, push: true } },
    });
    mockPrisma.pushSubscription.findMany.mockResolvedValue([
      { id: 'ps-stale', endpoint: 'e-stale', p256dh: 'k', auth: 'a' },
    ]);
    (webpush.sendNotification as jest.Mock).mockRejectedValue({ statusCode: 410 });
    mockPrisma.pushSubscription.delete.mockResolvedValue({});

    await service.notify({ type: 'weekly_progress', userId: 'u1', data: {} });

    expect(mockPrisma.pushSubscription.delete).toHaveBeenCalledWith({
      where: { id: 'ps-stale' },
    });
  });

  it('unsubscribe удаляет только свою подписку', async () => {
    mockPrisma.pushSubscription.deleteMany.mockResolvedValue({ count: 1 });
    await service.unsubscribe('u1', 'e1');
    expect(mockPrisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1', endpoint: 'e1' },
    });
  });
});
