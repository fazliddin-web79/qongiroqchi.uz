ALTER TABLE "Call" ADD COLUMN "providerCallId" TEXT;

CREATE INDEX "Call_providerCallId_idx" ON "Call"("providerCallId");
