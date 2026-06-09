import {
  encryptField,
  decryptField,
  createEncryptionMiddleware,
} from './encryption.middleware';

// Spec fixture: deterministic 32-byte input. NOT a real key.
// gitleaks:allow
const KEY = ('aaaa' + '0'.repeat(28)) as string;

describe('encryption.middleware', () => {
  describe('encryptField / decryptField', () => {
    it('round-trips utf8 text', () => {
      const plain = 'sensitive PHI value 🔒';
      const ciphertext = encryptField(plain, KEY);
      expect(ciphertext).not.toBe(plain);
      expect(decryptField(ciphertext, KEY)).toBe(plain);
    });

    it('returns input unchanged for non-encrypted (legacy/plain) values', () => {
      // Не три части — middleware считает поле «не зашифрованным».
      expect(decryptField('plain text without colons', KEY)).toBe(
        'plain text without colons',
      );
    });

    it('produces v1 format (3 parts) when no active key id set', () => {
      delete process.env.PHI_ENCRYPTION_KEY_ACTIVE_ID;
      delete process.env.PHI_ENCRYPTION_KEYS;
      const ciphertext = encryptField('hello', KEY);
      expect(ciphertext.split(':')).toHaveLength(3);
    });

    it('produces v2 format (5 parts with keyId) when active key configured', () => {
      process.env.PHI_ENCRYPTION_KEY_ACTIVE_ID = 'k2';
      process.env.PHI_ENCRYPTION_KEYS = JSON.stringify({
        k2: 'bbbb' + '0'.repeat(28),
      });
      const ciphertext = encryptField('hello', KEY);
      const parts = ciphertext.split(':');
      expect(parts[0]).toBe('v2');
      expect(parts[1]).toBe('k2');
      expect(parts).toHaveLength(5);
      // Cleanup для других тестов
      delete process.env.PHI_ENCRYPTION_KEY_ACTIVE_ID;
      delete process.env.PHI_ENCRYPTION_KEYS;
    });

    it('decrypts v1 records после ротации (backward-compat)', () => {
      delete process.env.PHI_ENCRYPTION_KEY_ACTIVE_ID;
      delete process.env.PHI_ENCRYPTION_KEYS;
      const v1Cipher = encryptField('legacy data', KEY);
      // Включаем v2 — но v1 запись должна читаться по legacy ключу
      process.env.PHI_ENCRYPTION_KEY_ACTIVE_ID = 'k2';
      process.env.PHI_ENCRYPTION_KEYS = JSON.stringify({
        k2: 'bbbb' + '0'.repeat(28),
      });
      expect(decryptField(v1Cipher, KEY)).toBe('legacy data');
      delete process.env.PHI_ENCRYPTION_KEY_ACTIVE_ID;
      delete process.env.PHI_ENCRYPTION_KEYS;
    });

    it('returns input unchanged for v2 with unknown keyId (safe fallback)', () => {
      const unknown = 'v2:unknownKey:abc:def:00';
      expect(decryptField(unknown, KEY)).toBe(unknown);
    });
  });

  describe('createEncryptionMiddleware', () => {
    const middleware = createEncryptionMiddleware(KEY);

    it('encrypts PHI fields for known model (User.phone)', async () => {
      const params = {
        model: 'User',
        action: 'create',
        args: { data: { phone: '+1234567890', name: 'X' } },
      };
      const next = jest.fn().mockResolvedValue({});
      await middleware(params as any, next);
      // phone должен быть зашифрован
      expect(params.args.data.phone).not.toBe('+1234567890');
      expect(params.args.data.phone.split(':').length).toBeGreaterThanOrEqual(3);
      // name — не PHI поле, не трогаем
      expect(params.args.data.name).toBe('X');
    });

    it('NOT shifrует поле `content` на неизвестной модели (per-model allow-list)', async () => {
      const params = {
        model: 'ChatMessage', // не в PHI_FIELDS_BY_MODEL
        action: 'create',
        args: { data: { content: 'public message' } },
      };
      const next = jest.fn().mockResolvedValue({});
      await middleware(params as any, next);
      // Раньше глобальный PHI_FIELDS зашифровал бы content на ЛЮБОЙ модели —
      // это foot-gun. Сейчас allow-list позволяет content только TherapistNote.
      expect(params.args.data.content).toBe('public message');
    });

    it('encrypts `content` ONLY на TherapistNote', async () => {
      const params = {
        model: 'TherapistNote',
        action: 'create',
        args: { data: { content: 'PHI note', patientId: 'p1' } },
      };
      const next = jest.fn().mockResolvedValue({});
      await middleware(params as any, next);
      expect(params.args.data.content).not.toBe('PHI note');
      // patientId — не PHI
      expect(params.args.data.patientId).toBe('p1');
    });

    it('decrypts PHI fields при чтении (findUnique)', async () => {
      const cipher = encryptField('hidden', KEY);
      const params = { model: 'CrisisEvent', action: 'findUnique', args: {} };
      const next = jest
        .fn()
        .mockResolvedValue({ triggerText: cipher, severity: 'HIGH' });
      const result = await middleware(params as any, next);
      expect(result.triggerText).toBe('hidden');
      expect(result.severity).toBe('HIGH');
    });

    it('skips middleware entirely для unknown model (fast path)', async () => {
      const params = { model: 'UnknownModel', action: 'create', args: { data: {} } };
      const next = jest.fn().mockResolvedValue('ok');
      const result = await middleware(params as any, next);
      expect(result).toBe('ok');
      expect(next).toHaveBeenCalledWith(params);
    });

    it('handles upsert update branch', async () => {
      const params = {
        model: 'User',
        action: 'upsert',
        args: {
          create: { phone: '+1234567890' },
          update: { phone: '+9876543210' },
        },
      };
      const next = jest.fn().mockResolvedValue({});
      await middleware(params as any, next);
      expect(params.args.create.phone).not.toBe('+1234567890');
      expect(params.args.update.phone).not.toBe('+9876543210');
    });

    it('encrypts PHI в createMany rows (#224)', async () => {
      const params = {
        model: 'User',
        action: 'createMany',
        args: {
          data: [
            { phone: '+1111111111', name: 'A' },
            { phone: '+2222222222', name: 'B' },
          ],
        },
      };
      const next = jest.fn().mockResolvedValue({ count: 2 });
      await middleware(params as any, next);
      expect(params.args.data[0].phone).not.toBe('+1111111111');
      expect(params.args.data[1].phone).not.toBe('+2222222222');
      // name — не PHI
      expect(params.args.data[0].name).toBe('A');
    });

    it('encrypts PHI в updateMany data (#224)', async () => {
      const params = {
        model: 'Session',
        action: 'updateMany',
        args: {
          where: { userId: 'u1' },
          data: { targetMemory: 'PHI memory' },
        },
      };
      const next = jest.fn().mockResolvedValue({ count: 3 });
      await middleware(params as any, next);
      expect(params.args.data.targetMemory).not.toBe('PHI memory');
      expect(decryptField(params.args.data.targetMemory, KEY)).toBe('PHI memory');
    });
  });
});
