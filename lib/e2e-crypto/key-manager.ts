/**
 * E2E Key Manager — управление ключами для end-to-end шифрования
 * терапевтических сессий. Использует Web Crypto API (браузерный).
 *
 * Архитектура:
 * - Каждый пользователь генерирует пару RSA-OAEP ключей при регистрации
 * - Для каждой сессии генерируется симметричный AES-GCM ключ
 * - Сессионный ключ шифруется публичным ключом получателя
 * - Сервер видит только шифротекст — zero-knowledge
 */

const ALGORITHM_RSA = {
  name: 'RSA-OAEP',
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: 'SHA-256',
} as const;

const ALGORITHM_AES = {
  name: 'AES-GCM',
  length: 256,
} as const;

export interface ExportedKeyPair {
  publicKey: string;   // Base64 SPKI
  privateKey: string;  // Base64 PKCS8
}

/** Генерация пары ключей RSA-OAEP для пользователя */
export async function generateKeyPair(): Promise<ExportedKeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    ALGORITHM_RSA,
    true,
    ['wrapKey', 'unwrapKey'],
  );

  const publicKeyBuffer = await crypto.subtle.exportKey('spki', keyPair.publicKey);
  const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

  return {
    publicKey: bufferToBase64(publicKeyBuffer),
    privateKey: bufferToBase64(privateKeyBuffer),
  };
}

/** Генерация симметричного ключа сессии (AES-256-GCM) */
export async function generateSessionKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(ALGORITHM_AES, true, ['encrypt', 'decrypt']);
}

/** Шифрование текста симметричным ключом сессии */
export async function encryptMessage(
  sessionKey: CryptoKey,
  plaintext: string,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sessionKey,
    encoded,
  );

  // Формат: iv:ciphertext (base64)
  return `${bufferToBase64(iv.buffer)}:${bufferToBase64(ciphertext)}`;
}

/** Дешифровка текста симметричным ключом сессии */
export async function decryptMessage(
  sessionKey: CryptoKey,
  encrypted: string,
): Promise<string> {
  const [ivB64, ciphertextB64] = encrypted.split(':');
  const iv = base64ToBuffer(ivB64);
  const ciphertext = base64ToBuffer(ciphertextB64);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    sessionKey,
    ciphertext,
  );

  return new TextDecoder().decode(decrypted);
}

/** Обернуть (зашифровать) сессионный ключ публичным RSA-ключом получателя */
export async function wrapSessionKey(
  sessionKey: CryptoKey,
  recipientPublicKeyB64: string,
): Promise<string> {
  const publicKeyBuffer = base64ToBuffer(recipientPublicKeyB64);
  const publicKey = await crypto.subtle.importKey(
    'spki',
    publicKeyBuffer,
    ALGORITHM_RSA,
    false,
    ['wrapKey'],
  );

  const wrapped = await crypto.subtle.wrapKey('raw', sessionKey, publicKey, 'RSA-OAEP');
  return bufferToBase64(wrapped);
}

/** Развернуть (расшифровать) сессионный ключ приватным RSA-ключом */
export async function unwrapSessionKey(
  wrappedKeyB64: string,
  privateKeyB64: string,
): Promise<CryptoKey> {
  const wrappedKey = base64ToBuffer(wrappedKeyB64);
  const privateKeyBuffer = base64ToBuffer(privateKeyB64);

  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBuffer,
    ALGORITHM_RSA,
    false,
    ['unwrapKey'],
  );

  return crypto.subtle.unwrapKey(
    'raw',
    wrappedKey,
    privateKey,
    'RSA-OAEP',
    ALGORITHM_AES,
    true,
    ['encrypt', 'decrypt'],
  );
}

// --- Утилиты ---

function bufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
