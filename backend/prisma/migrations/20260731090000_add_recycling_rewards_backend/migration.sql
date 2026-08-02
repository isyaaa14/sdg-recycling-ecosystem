-- Add recycling/reward backend support while keeping friend backend as source of truth.

ALTER TYPE "BadgeCriteriaType" ADD VALUE IF NOT EXISTS 'RECYCLING_APPROVED';

DROP INDEX IF EXISTS "PointsEvent_mission_completed_user_mission_key";

ALTER TABLE "PointsEvent"
  ALTER COLUMN "eventType" TYPE TEXT
  USING (
    CASE
      WHEN "eventType"::text = 'MISSION_APPROVED' THEN 'MISSION_COMPLETED'
      ELSE "eventType"::text
    END
  );

DROP TYPE "PointsEventType";

CREATE TYPE "PointsEventType" AS ENUM (
  'MISSION_COMPLETED',
  'RECYCLING_APPROVED',
  'REWARD_REDEEMED',
  'ADMIN_ADJUSTMENT'
);

ALTER TABLE "PointsEvent"
  ALTER COLUMN "eventType" TYPE "PointsEventType"
  USING "eventType"::"PointsEventType";

CREATE UNIQUE INDEX IF NOT EXISTS "PointsEvent_mission_completed_user_mission_key"
ON "PointsEvent" ("userId", "missionId", "eventType")
WHERE "eventType" = 'MISSION_COMPLETED' AND "missionId" IS NOT NULL;

CREATE TYPE "RecyclingSubmissionStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');

ALTER TABLE "User"
  ADD COLUMN "suspiciousActivityFlagged" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "lastRecyclingSubmissionAt" TIMESTAMP(3);

CREATE TABLE "PointRate" (
  "material" TEXT NOT NULL,
  "ratePerKg" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "PointRate_pkey" PRIMARY KEY ("material")
);

CREATE TABLE "RecyclingSubmission" (
  "id" SERIAL NOT NULL,
  "userId" TEXT NOT NULL,
  "materialType" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "proofImageUrl" TEXT,
  "status" "RecyclingSubmissionStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
  "isDuplicateFlagged" BOOLEAN NOT NULL DEFAULT false,
  "reviewNote" TEXT,
  "reviewedById" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  CONSTRAINT "RecyclingSubmission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RewardTier" (
  "tier" TEXT NOT NULL,
  "pointsRequired" INTEGER NOT NULL,
  CONSTRAINT "RewardTier_pkey" PRIMARY KEY ("tier")
);

CREATE TABLE "Reward" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "pointsRequired" INTEGER NOT NULL,
  "stock" INTEGER NOT NULL DEFAULT 0,
  "imageUrl" TEXT,
  "category" TEXT,
  "expiresAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "tier" TEXT NOT NULL DEFAULT 'small',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Reward_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Redemption" (
  "id" SERIAL NOT NULL,
  "userId" TEXT NOT NULL,
  "rewardId" INTEGER,
  "itemName" TEXT NOT NULL,
  "pointsSpent" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'claimed',
  "claimedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Redemption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RedemptionCooldown" (
  "id" SERIAL NOT NULL,
  "userId" TEXT NOT NULL,
  "rewardId" INTEGER NOT NULL,
  "lastRedeemedAt" TIMESTAMP(3),
  "countToday" INTEGER NOT NULL DEFAULT 0,
  "countWeek" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "RedemptionCooldown_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SuspiciousActivityLog" (
  "id" SERIAL NOT NULL,
  "userId" TEXT NOT NULL,
  "activityType" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'medium',
  "details" TEXT,
  "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SuspiciousActivityLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PointsEvent"
  ADD COLUMN "recyclingSubmissionId" INTEGER,
  ADD COLUMN "redemptionId" INTEGER;

CREATE INDEX "RecyclingSubmission_userId_submittedAt_idx" ON "RecyclingSubmission"("userId", "submittedAt");
CREATE INDEX "RecyclingSubmission_status_submittedAt_idx" ON "RecyclingSubmission"("status", "submittedAt");
CREATE INDEX "RecyclingSubmission_materialType_idx" ON "RecyclingSubmission"("materialType");
CREATE INDEX "Reward_isActive_tier_idx" ON "Reward"("isActive", "tier");
CREATE INDEX "Redemption_userId_createdAt_idx" ON "Redemption"("userId", "createdAt");
CREATE INDEX "Redemption_rewardId_idx" ON "Redemption"("rewardId");
CREATE UNIQUE INDEX "RedemptionCooldown_userId_rewardId_key" ON "RedemptionCooldown"("userId", "rewardId");
CREATE INDEX "SuspiciousActivityLog_userId_detectedAt_idx" ON "SuspiciousActivityLog"("userId", "detectedAt");
CREATE INDEX "SuspiciousActivityLog_severity_detectedAt_idx" ON "SuspiciousActivityLog"("severity", "detectedAt");

ALTER TABLE "RecyclingSubmission"
  ADD CONSTRAINT "RecyclingSubmission_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RecyclingSubmission"
  ADD CONSTRAINT "RecyclingSubmission_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Redemption"
  ADD CONSTRAINT "Redemption_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Redemption"
  ADD CONSTRAINT "Redemption_rewardId_fkey"
  FOREIGN KEY ("rewardId") REFERENCES "Reward"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RedemptionCooldown"
  ADD CONSTRAINT "RedemptionCooldown_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RedemptionCooldown"
  ADD CONSTRAINT "RedemptionCooldown_rewardId_fkey"
  FOREIGN KEY ("rewardId") REFERENCES "Reward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SuspiciousActivityLog"
  ADD CONSTRAINT "SuspiciousActivityLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PointsEvent"
  ADD CONSTRAINT "PointsEvent_recyclingSubmissionId_fkey"
  FOREIGN KEY ("recyclingSubmissionId") REFERENCES "RecyclingSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PointsEvent"
  ADD CONSTRAINT "PointsEvent_redemptionId_fkey"
  FOREIGN KEY ("redemptionId") REFERENCES "Redemption"("id") ON DELETE SET NULL ON UPDATE CASCADE;
