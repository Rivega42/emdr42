-- #161 — приём заявок с маркетингового сайта (Lead funnel)
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "source" TEXT,
    "utm" JSONB,
    "preferredContactChannel" TEXT,
    "preferredTime" TEXT,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "assignedTherapistId" TEXT,
    "convertedUserId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "consentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Lead_status_idx" ON "Lead"("status");
CREATE INDEX "Lead_email_idx" ON "Lead"("email");
CREATE INDEX "Lead_assignedTherapistId_idx" ON "Lead"("assignedTherapistId");
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");
