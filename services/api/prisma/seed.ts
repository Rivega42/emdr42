import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@emdr42.com' },
    update: {},
    create: {
      email: 'admin@emdr42.com',
      name: 'Admin',
      passwordHash: adminPassword,
      role: Role.ADMIN,
    },
  });

  // Create test therapist
  const therapistPassword = await bcrypt.hash('therapist123', 10);
  const therapist = await prisma.user.upsert({
    where: { email: 'therapist@emdr42.com' },
    update: {},
    create: {
      email: 'therapist@emdr42.com',
      name: 'Dr. Sarah Thompson',
      passwordHash: therapistPassword,
      role: Role.THERAPIST,
    },
  });

  // Create test patient
  const patientPassword = await bcrypt.hash('patient123', 10);
  const patient = await prisma.user.upsert({
    where: { email: 'patient@emdr42.com' },
    update: {},
    create: {
      email: 'patient@emdr42.com',
      name: 'Alex Johnson',
      passwordHash: patientPassword,
      role: Role.PATIENT,
    },
  });

  // Create default platform settings
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

  // Create default achievements
  const achievements = [
    { type: 'first_session', name: 'First Step', description: 'Complete your first EMDR session', icon: '🌱', xpReward: 20 },
    { type: '3_sessions', name: 'Getting Started', description: 'Complete 3 sessions', icon: '🌿', xpReward: 30 },
    { type: '10_sessions', name: 'Committed', description: 'Complete 10 sessions', icon: '🌳', xpReward: 50 },
    { type: '7_day_streak', name: 'Week Warrior', description: '7 days in a row', icon: '🔥', xpReward: 40 },
    { type: 'suds_drop_50', name: 'Breakthrough', description: 'SUDS dropped by 50%+', icon: '⭐', xpReward: 30 },
    { type: 'voc_max', name: 'Full Belief', description: 'VOC reached 7/7', icon: '💎', xpReward: 25 },
    { type: 'full_protocol', name: 'Complete Protocol', description: 'All 8 EMDR phases completed', icon: '🏆', xpReward: 50 },
  ];

  for (const ach of achievements) {
    await prisma.achievement.upsert({
      where: { type: ach.type },
      update: {},
      create: ach,
    });
  }

  console.log('Seed completed:', { admin: admin.email, therapist: therapist.email, patient: patient.email });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
