import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

// Поля, содержащие PHI (Protected Health Information) — HIPAA §164.514.
// При расширении списка убедиться, что соответствующие поля Prisma имеют
// тип `String?` и достаточную длину (AES-GCM + iv + tag увеличивает размер).
const PHI_FIELDS = [
  // Session-level
  'targetMemory',
  'targetImage',
  'negativeCognition',
  'positiveCognition',
  'closureTechnique',
  'clientStateAtEnd',
  'betweenSessionNotes',
  'bodyLocation',
  'transcriptText',
  // Crisis-level
  'triggerText',
  // Therapist note
  'content',
  // User-level PII/PHI
  'phone',
  'emergencyContactName',
  'emergencyContactPhone',
  // MFA — секрет TOTP (схема комментарием обещает encrypted; теперь действительно)
  'mfaSecret',
];

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function deriveKey(secret: string): Buffer {
  return scryptSync(secret, 'emdr42-phi-salt', 32);
}

/**
 * Key registry для версионирования (#B3). Без неё ротация PHI_ENCRYPTION_KEY
 * делала все ранее записанные данные нерасшифровываемыми.
 *
 * Активный ключ → новые записи шифруются им (с keyId в префиксе).
 * Старые ключи → читают legacy-записи (формат `iv:tag:enc` без префикса
 * = "v1" implicit) и v2-записи с соответствующим keyId.
 *
 * Env:
 *   PHI_ENCRYPTION_KEY            — fallback / legacy key (v1 совместимость)
 *   PHI_ENCRYPTION_KEY_ACTIVE_ID  — id текущего активного ключа (для записи)
 *   PHI_ENCRYPTION_KEYS           — JSON {id: secret} для расшифровки старых
 *
 * При первой ротации:
 *   1. Добавить новый ключ в PHI_ENCRYPTION_KEYS как {"k2":"<new>"}
 *   2. PHI_ENCRYPTION_KEY_ACTIVE_ID=k2 — новые записи теперь шифруются им
 *   3. Старый ключ PHI_ENCRYPTION_KEY остаётся для чтения legacy (v1).
 */
function buildKeyRegistry(legacyKey: string): {
  activeId: string;
  keys: Map<string, string>;
} {
  const keys = new Map<string, string>();
  // v1 fallback / legacy записи без префикса
  keys.set('v1', legacyKey);

  const raw = process.env.PHI_ENCRYPTION_KEYS;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, string>;
      for (const [id, secret] of Object.entries(parsed)) {
        if (typeof secret === 'string' && secret.length >= 32) {
          keys.set(id, secret);
        }
      }
    } catch {
      // ignore malformed — fall back to legacy
    }
  }

  const activeId = process.env.PHI_ENCRYPTION_KEY_ACTIVE_ID || 'v1';
  if (!keys.has(activeId)) {
    // active id указан, но соответствующего ключа нет → fall back to v1
    return { activeId: 'v1', keys };
  }
  return { activeId, keys };
}

export function encryptField(value: string, secret: string): string {
  const registry = buildKeyRegistry(secret);
  const activeSecret = registry.keys.get(registry.activeId) ?? secret;
  const key = deriveKey(activeSecret);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  if (registry.activeId === 'v1') {
    // Legacy формат: iv:authTag:encrypted (backward-compatible read).
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }
  // v2: keyId:iv:authTag:encrypted (4-part)
  return `v2:${registry.activeId}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decryptField(encryptedValue: string, secret: string): string {
  const registry = buildKeyRegistry(secret);
  const parts = encryptedValue.split(':');

  let keySecret: string;
  let ivHex: string;
  let authTagHex: string;
  let encrypted: string;

  if (parts.length === 5 && parts[0] === 'v2') {
    // v2:keyId:iv:authTag:encrypted
    const keyId = parts[1];
    const found = registry.keys.get(keyId);
    if (!found) {
      // Неизвестный keyId — лучше вернуть оригинал, чем кидать. Логирование
      // должно сработать на следующем уровне.
      return encryptedValue;
    }
    keySecret = found;
    ivHex = parts[2];
    authTagHex = parts[3];
    encrypted = parts[4];
  } else if (parts.length === 3) {
    // Legacy / v1: iv:authTag:encrypted
    keySecret = registry.keys.get('v1') ?? secret;
    ivHex = parts[0];
    authTagHex = parts[1];
    encrypted = parts[2];
  } else {
    return encryptedValue; // не зашифровано
  }

  const key = deriveKey(keySecret);
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
