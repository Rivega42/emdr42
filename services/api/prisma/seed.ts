import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

/**
 * Seed data generator (#126).
 *
 * Safety:
 *   - В production seed отказывается запускаться, чтобы случайно не залить
 *     тестовых пользователей со слабыми паролями.
 *   - Пароли генерируются случайно и выводятся в stdout (dev only).
 *   - Переопределить можно через SEED_ALLOW_PROD=1 (для CI с изолированной БД).
 */

const isProduction = process.env.NODE_ENV === 'production';
const isCiOrStaging = process.env.SEED_ALLOW_PROD === '1';

if (isProduction && !isCiOrStaging) {
  console.error(
    '[seed] Refusing to seed in NODE_ENV=production. ' +
      'Set SEED_ALLOW_PROD=1 if you really want to (e.g. on isolated staging DB).',
  );
  process.exit(1);
}

/**
 * Генерирует читаемый random пароль минимум 16 символов + гарантированные
 * классы символов (upper/lower/digit/special) — соответствует OWASP ASVS 2.1.1.
 */
const generatePassword = (): string => {
  const specials = '!@#$%^&*-_=+?';
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const all = upper + lower + digits + specials;

  const pickFrom = (charset: string) =>
    charset[randomBytes(1)[0] % charset.length];

  let pwd =
    pickFrom(upper) + pickFrom(lower) + pickFrom(digits) + pickFrom(specials);
  while (pwd.length < 20) pwd += pickFrom(all);

  // Shuffle
  return pwd
    .split('')
    .sort(() => randomBytes(1)[0] - 128)
    .join('');
};

async function main() {
  const credentials: Record<string, string> = {};

  const seedUser = async (email: string, name: string, role: Role) => {
    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.upsert({
      where: { email },
      update: { passwordHash, name, role },
      create: { email, name, passwordHash, role },
    });
    credentials[email] = password;
  };

  await seedUser('admin@emdr42.local', 'Admin', Role.ADMIN);
  await seedUser('therapist@emdr42.local', 'Dr. Sarah Thompson', Role.THERAPIST);
  await seedUser('patient@emdr42.local', 'Alex Johnson', Role.PATIENT);

  const defaultSettings = [
    { key: 'llm_provider', value: { primary: 'anthropic', fallback: 'openai' }, category: 'ai_providers' },
    { key: 'stt_provider', value: { primary: 'deepgram', fallback: 'openai-whisper' }, category: 'ai_providers' },
    { key: 'tts_provider', value: { primary: 'openai-tts', fallback: 'piper' }, category: 'ai_providers' },
    { key: 'default_bls_speed', value: { value: 1.0 }, category: 'emdr_protocol' },
    { key: 'default_set_length', value: { value: 30 }, category: 'emdr_protocol' },
    { key: 'stress_critical_threshold', value: { value: 0.9 }, category: 'emdr_protocol' },
    { key: 'dissociation_attention_min', value: { value: 0.1 }, category: 'emdr_protocol' },
    { key: 'max_session_duration', value: { value: 3600 }, category: 'platform' },
    { key: 'maintenance_mode', value: { enabled: false }, category: 'platform' },
  ];

  for (const setting of defaultSettings) {
    await prisma.platformSettings.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }

  console.log('[seed] Seed completed. Generated credentials (dev only — save them now):');
  for (const [email, pwd] of Object.entries(credentials)) {
    console.log(`  ${email.padEnd(30)} ${pwd}`);
  }
  console.log(
    '[seed] These passwords are written to stdout only and not stored. Record them securely.',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
