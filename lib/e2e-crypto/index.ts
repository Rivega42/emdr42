/**
 * @emdr42/e2e-crypto — E2E шифрование терапевтических сессий
 *
 * Использование:
 *
 * 1. При регистрации — генерация ключей:
 *    const keys = await generateKeyPair();
 *    // Сохранить publicKey на сервер, privateKey — в IndexedDB
 *
 * 2. При начале сессии — генерация сессионного ключа:
 *    const sessionKey = await generateSessionKey();
 *    const wrappedForTherapist = await wrapSessionKey(sessionKey, therapistPublicKey);
 *    const wrappedForPatient = await wrapSessionKey(sessionKey, patientPublicKey);
 *    // Отправить обёрнутые ключи на сервер
 *
 * 3. Шифрование сообщений:
 *    const encrypted = await encryptMessage(sessionKey, "текст сообщения");
 *    // Отправить encrypted на сервер
 *
 * 4. Дешифровка:
 *    const sessionKey = await unwrapSessionKey(wrappedKey, myPrivateKey);
 *    const text = await decryptMessage(sessionKey, encrypted);
 */

export {
  generateKeyPair,
  generateSessionKey,
  encryptMessage,
  decryptMessage,
  wrapSessionKey,
  unwrapSessionKey,
} from './key-manager';

export type { ExportedKeyPair } from './key-manager';
