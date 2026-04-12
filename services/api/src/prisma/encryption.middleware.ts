import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

// Поля, содержащие PHI (Protected Health Information)
const PHI_FIELDS = [
  'targetMemory',
  'targetImage',
  'negativeCognition',
  'positiveCognition',
  'closureTechnique',
  'clientStateAtEnd',
  'betweenSessionNotes',
  'bodyLocation',
];

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function deriveKey(secret: string): Buffer {
  return scryptSync(secret, 'emdr42-phi-salt', 32);
}

export function encryptField(value: string, secret: string): string {
  const key = deriveKey(secret);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  // Формат: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decryptField(encryptedValue: string, secret: string): string {
  const key = deriveKey(secret);
  const parts = encryptedValue.split(':');
  if (parts.length !== 3) return encryptedValue; // не зашифровано — вернуть как есть

  const [ivHex, authTagHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Prisma middleware для автоматического шифрования/дешифровки PHI полей.
 * Использует AES-256-GCM с ключом из переменной PHI_ENCRYPTION_KEY.
 */
export function createEncryptionMiddleware(secret: string) {
  return async (params: any, next: (params: any) => Promise<any>) => {
    // Шифруем при создании/обновлении
    if (['create', 'update', 'upsert'].includes(params.action)) {
      const dataKey = params.action === 'upsert' ? 'create' : 'data';
      const data = params.args?.[dataKey];
      if (data) {
        for (const field of PHI_FIELDS) {
          if (typeof data[field] === 'string' && data[field]) {
            data[field] = encryptField(data[field], secret);
          }
        }
      }
      // Для upsert также шифруем update-часть
      if (params.action === 'upsert' && params.args?.update) {
        for (const field of PHI_FIELDS) {
          if (typeof params.args.update[field] === 'string' && params.args.update[field]) {
            params.args.update[field] = encryptField(params.args.update[field], secret);
          }
        }
      }
    }

    const result = await next(params);

    // Дешифруем при чтении
    if (result && ['findUnique', 'findFirst', 'findMany'].includes(params.action)) {
      const decryptRecord = (record: any) => {
        if (!record) return record;
        for (const field of PHI_FIELDS) {
          if (typeof record[field] === 'string' && record[field]) {
            try {
              record[field] = decryptField(record[field], secret);
            } catch {
              // Поле не зашифровано — оставить как есть
            }
          }
        }
        return record;
      };

      if (Array.isArray(result)) {
        result.forEach(decryptRecord);
      } else {
        decryptRecord(result);
      }
    }

    return result;
  };
}
