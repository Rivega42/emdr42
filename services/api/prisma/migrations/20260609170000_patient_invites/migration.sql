-- #160 — приглашение пациента по ссылке

CREATE TABLE "PatientInvite" (
    "id" TEXT NOT NULL,
    "therapistId" TEXT NOT NULL,
    "email" TEXT,
    "notes" TEXT,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "acceptedByUserId" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PatientInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PatientInvite_tokenHash_key" ON "PatientInvite"("tokenHash");
CREATE INDEX "PatientInvite_therapistId_idx" ON "PatientInvite"("therapistId");
CREATE INDEX "PatientInvite_email_idx" ON "PatientInvite"("email");
CREATE INDEX "PatientInvite_expiresAt_idx" ON "PatientInvite"("expiresAt");

ALTER TABLE "PatientInvite" ADD CONSTRAINT "PatientInvite_therapistId_fkey"
    FOREIGN KEY ("therapistId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PatientInvite" ADD CONSTRAINT "PatientInvite_acceptedByUserId_fkey"
    FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
