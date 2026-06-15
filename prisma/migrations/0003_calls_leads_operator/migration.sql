-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('PENDING', 'CALLING', 'ANSWERED', 'NOT_ANSWERED', 'BUSY', 'FAILED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'INTERESTED', 'NOT_INTERESTED', 'SOLD', 'ARCHIVED');

-- Extend the legacy lead table before backfilling its contact and status data.
ALTER TABLE "Lead" ADD COLUMN     "callId" UUID,
ADD COLUMN     "callbackAt" TIMESTAMP(3),
ADD COLUMN     "campaignId" UUID,
ADD COLUMN     "contactId" UUID,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "statusNext" "LeadStatus" NOT NULL DEFAULT 'NEW';

UPDATE "Lead"
SET "statusNext" = CASE UPPER("status")
  WHEN 'CONTACTED' THEN 'CONTACTED'::"LeadStatus"
  WHEN 'INTERESTED' THEN 'INTERESTED'::"LeadStatus"
  WHEN 'NOT_INTERESTED' THEN 'NOT_INTERESTED'::"LeadStatus"
  WHEN 'SOLD' THEN 'SOLD'::"LeadStatus"
  WHEN 'ARCHIVED' THEN 'ARCHIVED'::"LeadStatus"
  ELSE 'NEW'::"LeadStatus"
END;

-- Preserve legacy lead identity and phone data by creating matching contacts.
WITH legacy AS (
  SELECT DISTINCT ON ("companyId", "phone") *
  FROM "Lead"
  WHERE "phone" IS NOT NULL AND "phone" <> ''
  ORDER BY "companyId", "phone", "createdAt"
)
INSERT INTO "Contact" ("id", "companyId", "fullName", "phone", "extraFields", "status", "createdAt", "updatedAt", "deletedAt")
SELECT
  (substr(md5(legacy."id"::text || ':contact'), 1, 8) || '-' || substr(md5(legacy."id"::text || ':contact'), 9, 4) || '-' || substr(md5(legacy."id"::text || ':contact'), 13, 4) || '-' || substr(md5(legacy."id"::text || ':contact'), 17, 4) || '-' || substr(md5(legacy."id"::text || ':contact'), 21, 12))::uuid,
  legacy."companyId",
  legacy."name",
  legacy."phone",
  CASE WHEN legacy."email" IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('email', legacy."email") END,
  'ACTIVE'::"ContactStatus",
  legacy."createdAt",
  legacy."updatedAt",
  NULL
FROM legacy
WHERE NOT EXISTS (
  SELECT 1 FROM "Contact"
  WHERE "Contact"."companyId" = legacy."companyId"
    AND "Contact"."phone" = legacy."phone"
    AND "Contact"."deletedAt" IS NULL
);

UPDATE "Lead"
SET "contactId" = "Contact"."id"
FROM "Contact"
WHERE "Contact"."companyId" = "Lead"."companyId"
  AND "Contact"."phone" = "Lead"."phone"
  AND "Contact"."deletedAt" IS NULL;

ALTER TABLE "Lead"
DROP COLUMN "email",
DROP COLUMN "name",
DROP COLUMN "phone",
DROP COLUMN "status";

ALTER TABLE "Lead" RENAME COLUMN "statusNext" TO "status";

-- CreateTable
CREATE TABLE "LeadHistory" (
    "id" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "userId" UUID,
    "action" TEXT NOT NULL,
    "fromStatus" "LeadStatus",
    "toStatus" "LeadStatus",
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "LeadHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Call" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "contactId" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "status" "CallStatus" NOT NULL DEFAULT 'PENDING',
    "duration" INTEGER,
    "pressedKey" TEXT,
    "recordingUrl" TEXT,
    "errorMessage" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Call_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadHistory_leadId_idx" ON "LeadHistory"("leadId");

-- CreateIndex
CREATE INDEX "LeadHistory_userId_idx" ON "LeadHistory"("userId");

-- CreateIndex
CREATE INDEX "Call_companyId_idx" ON "Call"("companyId");

-- CreateIndex
CREATE INDEX "Call_campaignId_idx" ON "Call"("campaignId");

-- CreateIndex
CREATE INDEX "Call_contactId_idx" ON "Call"("contactId");

-- CreateIndex
CREATE INDEX "Call_status_idx" ON "Call"("status");

-- CreateIndex
CREATE INDEX "Call_createdAt_idx" ON "Call"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Call_campaignId_contactId_key" ON "Call"("campaignId", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_callId_key" ON "Lead"("callId");

-- CreateIndex
CREATE INDEX "Lead_campaignId_idx" ON "Lead"("campaignId");

-- CreateIndex
CREATE INDEX "Lead_contactId_idx" ON "Lead"("contactId");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_callbackAt_idx" ON "Lead"("callbackAt");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadHistory" ADD CONSTRAINT "LeadHistory_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadHistory" ADD CONSTRAINT "LeadHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
