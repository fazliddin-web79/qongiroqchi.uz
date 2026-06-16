CREATE TYPE "CompanyStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "AudioReviewStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');
CREATE TYPE "ModerationSubjectType" AS ENUM ('AUDIO', 'CAMPAIGN');
CREATE TYPE "ModerationDecision" AS ENUM ('APPROVED', 'REJECTED', 'CHANGES_REQUESTED');
CREATE TYPE "NotificationAudience" AS ENUM ('PLATFORM', 'COMPANY', 'USER');

ALTER TYPE "CampaignStatus" ADD VALUE 'AUDIO_UPLOADED';
ALTER TYPE "CampaignStatus" ADD VALUE 'PENDING_REVIEW';
ALTER TYPE "CampaignStatus" ADD VALUE 'APPROVED';
ALTER TYPE "CampaignStatus" ADD VALUE 'REJECTED';
ALTER TYPE "CampaignStatus" ADD VALUE 'CHANGES_REQUESTED';
ALTER TYPE "CampaignStatus" ADD VALUE 'CANCELED';

BEGIN;
CREATE TYPE "RoleName_new" AS ENUM (
  'SUPER_ADMIN', 'PLATFORM_ADMIN', 'MODERATOR', 'SUPPORT', 'BILLING_MANAGER',
  'COMPANY_OWNER', 'COMPANY_ADMIN', 'MANAGER', 'OPERATOR', 'ANALYST', 'ACCOUNTANT'
);
ALTER TABLE "Role" ALTER COLUMN "name" TYPE "RoleName_new"
USING (
  CASE WHEN "name"::text = 'ADMIN' THEN 'COMPANY_OWNER' ELSE "name"::text END
)::"RoleName_new";
ALTER TYPE "RoleName" RENAME TO "RoleName_old";
ALTER TYPE "RoleName_new" RENAME TO "RoleName";
DROP TYPE "RoleName_old";
COMMIT;

ALTER TABLE "Campaign" ADD COLUMN "audioAssetId" UUID,
ADD COLUMN "rejectionReason" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewedById" UUID,
ADD COLUMN "submittedAt" TIMESTAMP(3);

ALTER TABLE "Company" ADD COLUMN "status" "CompanyStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "suspendedAt" TIMESTAMP(3),
ADD COLUMN "suspensionReason" TEXT;

ALTER TABLE "CompanySetting" ADD COLUMN "concurrentCallLimit" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN "dailyCallLimit" INTEGER NOT NULL DEFAULT 1000,
ADD COLUMN "retryBusy" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "retryFailed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "retryUnanswered" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "AudioAsset" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "url" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "durationSeconds" INTEGER,
  "status" "AudioReviewStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "rejectionReason" TEXT,
  "createdById" UUID NOT NULL,
  "reviewedById" UUID,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "AudioAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ModerationReview" (
  "id" UUID NOT NULL,
  "subjectType" "ModerationSubjectType" NOT NULL,
  "decision" "ModerationDecision" NOT NULL,
  "reason" TEXT,
  "metadata" JSONB,
  "companyId" UUID NOT NULL,
  "reviewerId" UUID NOT NULL,
  "campaignId" UUID,
  "audioAssetId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "ModerationReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
  "id" UUID NOT NULL,
  "audience" "NotificationAudience" NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "companyId" UUID,
  "recipientUserId" UUID,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImpersonationSession" (
  "id" UUID NOT NULL,
  "platformUserId" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "reason" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "endedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "ImpersonationSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AudioAsset_companyId_idx" ON "AudioAsset"("companyId");
CREATE INDEX "AudioAsset_createdById_idx" ON "AudioAsset"("createdById");
CREATE INDEX "AudioAsset_reviewedById_idx" ON "AudioAsset"("reviewedById");
CREATE INDEX "AudioAsset_status_idx" ON "AudioAsset"("status");
CREATE INDEX "ModerationReview_companyId_idx" ON "ModerationReview"("companyId");
CREATE INDEX "ModerationReview_reviewerId_idx" ON "ModerationReview"("reviewerId");
CREATE INDEX "ModerationReview_campaignId_idx" ON "ModerationReview"("campaignId");
CREATE INDEX "ModerationReview_audioAssetId_idx" ON "ModerationReview"("audioAssetId");
CREATE INDEX "ModerationReview_subjectType_decision_idx" ON "ModerationReview"("subjectType", "decision");
CREATE INDEX "Notification_audience_idx" ON "Notification"("audience");
CREATE INDEX "Notification_companyId_idx" ON "Notification"("companyId");
CREATE INDEX "Notification_recipientUserId_idx" ON "Notification"("recipientUserId");
CREATE INDEX "Notification_readAt_idx" ON "Notification"("readAt");
CREATE INDEX "ImpersonationSession_platformUserId_idx" ON "ImpersonationSession"("platformUserId");
CREATE INDEX "ImpersonationSession_companyId_idx" ON "ImpersonationSession"("companyId");
CREATE INDEX "ImpersonationSession_expiresAt_idx" ON "ImpersonationSession"("expiresAt");
CREATE INDEX "Campaign_audioAssetId_idx" ON "Campaign"("audioAssetId");
CREATE INDEX "Campaign_reviewedById_idx" ON "Campaign"("reviewedById");

ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_audioAssetId_fkey" FOREIGN KEY ("audioAssetId") REFERENCES "AudioAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AudioAsset" ADD CONSTRAINT "AudioAsset_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AudioAsset" ADD CONSTRAINT "AudioAsset_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AudioAsset" ADD CONSTRAINT "AudioAsset_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ModerationReview" ADD CONSTRAINT "ModerationReview_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ModerationReview" ADD CONSTRAINT "ModerationReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ModerationReview" ADD CONSTRAINT "ModerationReview_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ModerationReview" ADD CONSTRAINT "ModerationReview_audioAssetId_fkey" FOREIGN KEY ("audioAssetId") REFERENCES "AudioAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ImpersonationSession" ADD CONSTRAINT "ImpersonationSession_platformUserId_fkey" FOREIGN KEY ("platformUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImpersonationSession" ADD CONSTRAINT "ImpersonationSession_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "AudioAsset" (
  "id", "companyId", "url", "originalName", "mimeType", "sizeBytes", "status",
  "createdById", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid(), campaign."companyId", campaign."audioUrl",
  'legacy-' || campaign."id"::text, 'application/octet-stream', 0, 'PENDING_REVIEW',
  campaign."createdById", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Campaign" AS campaign
WHERE campaign."audioUrl" IS NOT NULL;

UPDATE "Campaign" AS campaign
SET "audioAssetId" = audio."id",
    "status" = CASE
      WHEN campaign."status" = 'DRAFT' THEN 'AUDIO_UPLOADED'::"CampaignStatus"
      ELSE campaign."status"
    END
FROM "AudioAsset" AS audio
WHERE audio."originalName" = 'legacy-' || campaign."id"::text;
