-- #112 Therapist↔Patient relationships, #121 GDPR fields,
-- #122 recording fields, #114 RefreshToken, #147 CrisisEvent,
-- #149 VerificationToken, #130 UsageLog, #120 AuditLog extensions.

-- User: add crisis/emergency contact + GDPR fields
ALTER TABLE "User"
  ADD COLUMN "country" TEXT,
  ADD COLUMN "emergencyContactName" TEXT,
  ADD COLUMN "emergencyContactPhone" TEXT,
  ADD COLUMN "emergencyContactRel" TEXT,
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "dataConsentAt" TIMESTAMP(3),
  ADD COLUMN "tosAcceptedVersion" TEXT;

CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- Session: therapist link + recording + retention
ALTER TABLE "Session"
  ADD COLUMN "therapistId" TEXT,
  ADD COLUMN "recordingUrl" TEXT,
  ADD COLUMN "recordingStorageKey" TEXT,
  ADD COLUMN "recordingEncryptionKeyId" TEXT,
  ADD COLUMN "recordingConsentAt" TIMESTAMP(3),
  ADD COLUMN "transcriptText" TEXT,
  ADD COLUMN "dataExpiresAt" TIMESTAMP(3),
  ADD COLUMN "deletedAt" TIMESTAMP(3);

ALTER TABLE "Session"
  ADD CONSTRAINT "Session_therapistId_fkey" FOREIGN KEY ("therapistId")
    REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Session_therapistId_idx" ON "Session"("therapistId");
CREATE INDEX "Session_dataExpiresAt_idx" ON "Session"("dataExpiresAt");
CREATE INDEX "Session_deletedAt_idx" ON "Session"("deletedAt");

-- TherapistPatient junction
CREATE TABLE "TherapistPatient" (
    "id" TEXT NOT NULL,
    "therapistId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dischargedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "TherapistPatient_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TherapistPatient_therapistId_patientId_key"
  ON "TherapistPatient"("therapistId", "patientId");
CREATE INDEX "TherapistPatient_therapistId_idx" ON "TherapistPatient"("therapistId");
CREATE INDEX "TherapistPatient_patientId_idx" ON "TherapistPatient"("patientId");
CREATE INDEX "TherapistPatient_status_idx" ON "TherapistPatient"("status");

ALTER TABLE "TherapistPatient"
  ADD CONSTRAINT "TherapistPatient_therapistId_fkey" FOREIGN KEY ("therapistId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TherapistPatient"
  ADD CONSTRAINT "TherapistPatient_patientId_fkey" FOREIGN KEY ("patientId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- TherapistNote
CREATE TABLE "TherapistNote" (
    "id" TEXT NOT NULL,
    "therapistId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "sessionId" TEXT,
    "content" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TherapistNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TherapistNote_therapistId_idx" ON "TherapistNote"("therapistId");
CREATE INDEX "TherapistNote_patientId_idx" ON "TherapistNote"("patientId");
CREATE INDEX "TherapistNote_sessionId_idx" ON "TherapistNote"("sessionId");

ALTER TABLE "TherapistNote"
  ADD CONSTRAINT "TherapistNote_therapistId_fkey" FOREIGN KEY ("therapistId")
    REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CrisisEvent (#147)
CREATE TABLE "CrisisEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT,
    "severity" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "triggerText" TEXT,
    "actionTaken" TEXT NOT NULL,
    "hotlineShown" TEXT,
    "therapistNotified" BOOLEAN NOT NULL DEFAULT false,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrisisEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CrisisEvent_userId_idx" ON "CrisisEvent"("userId");
CREATE INDEX "CrisisEvent_severity_idx" ON "CrisisEvent"("severity");
CREATE INDEX "CrisisEvent_createdAt_idx" ON "CrisisEvent"("createdAt");

-- RefreshToken (#114)
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");
CREATE INDEX "RefreshToken_tokenHash_idx" ON "RefreshToken"("tokenHash");
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- VerificationToken (#149)
CREATE TABLE "VerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VerificationToken_tokenHash_key" ON "VerificationToken"("tokenHash");
CREATE INDEX "VerificationToken_userId_idx" ON "VerificationToken"("userId");
CREATE INDEX "VerificationToken_tokenHash_idx" ON "VerificationToken"("tokenHash");
CREATE INDEX "VerificationToken_expiresAt_idx" ON "VerificationToken"("expiresAt");

-- UsageLog (#130)
CREATE TABLE "UsageLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "provider" TEXT NOT NULL,
    "providerType" TEXT NOT NULL,
    "model" TEXT,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER,
    "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UsageLog_userId_idx" ON "UsageLog"("userId");
CREATE INDEX "UsageLog_sessionId_idx" ON "UsageLog"("sessionId");
CREATE INDEX "UsageLog_provider_idx" ON "UsageLog"("provider");
CREATE INDEX "UsageLog_timestamp_idx" ON "UsageLog"("timestamp");

-- AuditLog: extend with actorId, correlationId, success (#120)
ALTER TABLE "AuditLog"
  ADD COLUMN "actorId" TEXT,
  ADD COLUMN "correlationId" TEXT,
  ADD COLUMN "success" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");
CREATE INDEX "AuditLog_userId_timestamp_idx" ON "AuditLog"("userId", "timestamp");
