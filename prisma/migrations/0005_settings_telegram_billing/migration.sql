CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED');

CREATE TABLE "CompanySetting" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "telegramBotToken" TEXT,
  "telegramChatId" TEXT,
  "defaultRetryCount" INTEGER NOT NULL DEFAULT 0,
  "workingHours" JSONB NOT NULL DEFAULT '{"enabled":false,"start":"09:00","end":"18:00","days":[1,2,3,4,5]}',
  "callSpeedLimit" INTEGER NOT NULL DEFAULT 60,
  "defaultLanguage" TEXT NOT NULL DEFAULT 'uz',
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Tashkent',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "CompanySetting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Plan" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "monthlyPrice" DECIMAL(12,2) NOT NULL,
  "callLimit" INTEGER NOT NULL,
  "userLimit" INTEGER NOT NULL,
  "campaignLimit" INTEGER NOT NULL,
  "features" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompanySubscription" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "planId" UUID NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "CompanySubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompanySetting_companyId_key" ON "CompanySetting"("companyId");
CREATE UNIQUE INDEX "Plan_name_key" ON "Plan"("name");
CREATE INDEX "CompanySubscription_companyId_idx" ON "CompanySubscription"("companyId");
CREATE INDEX "CompanySubscription_planId_idx" ON "CompanySubscription"("planId");
CREATE INDEX "CompanySubscription_status_idx" ON "CompanySubscription"("status");
CREATE INDEX "CompanySubscription_startsAt_endsAt_idx" ON "CompanySubscription"("startsAt", "endsAt");

ALTER TABLE "CompanySetting" ADD CONSTRAINT "CompanySetting_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompanySubscription" ADD CONSTRAINT "CompanySubscription_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompanySubscription" ADD CONSTRAINT "CompanySubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "Plan" ("id", "name", "monthlyPrice", "callLimit", "userLimit", "campaignLimit", "features", "createdAt", "updatedAt")
VALUES ('00000000-0000-4000-8000-000000000001', 'Free', 0, 1000, 5, 5, '{"telegram":true,"queue":true}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "CompanySetting" ("id", "companyId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Company"
ON CONFLICT ("companyId") DO NOTHING;

INSERT INTO "CompanySubscription" ("id", "companyId", "planId", "status", "startsAt", "endsAt", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "id", '00000000-0000-4000-8000-000000000001', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '100 years', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Company"
WHERE NOT EXISTS (
  SELECT 1 FROM "CompanySubscription" WHERE "CompanySubscription"."companyId" = "Company"."id"
);
