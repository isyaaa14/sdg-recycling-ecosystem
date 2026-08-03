-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('RESERVED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RecyclingSubmissionStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RecyclingSubmissionSource" AS ENUM ('MANUAL', 'QR');

-- CreateEnum
CREATE TYPE "RecyclingQrStatus" AS ENUM ('ISSUED', 'CLAIMED', 'EXPIRED', 'INVALIDATED');

-- AlterEnum
ALTER TYPE "BadgeCriteriaType" ADD VALUE 'RECYCLING_APPROVED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PointsEventType" ADD VALUE 'RECYCLING_APPROVED';
ALTER TYPE "PointsEventType" ADD VALUE 'REWARD_REDEEMED';
ALTER TYPE "PointsEventType" ADD VALUE 'REWARD_REFUNDED';
ALTER TYPE "PointsEventType" ADD VALUE 'ADMIN_ADJUSTMENT';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UploadPurpose" ADD VALUE 'RECYCLING_PROOF';
ALTER TYPE "UploadPurpose" ADD VALUE 'REWARD_IMAGE';

-- AlterTable
ALTER TABLE "PointsEvent" ADD COLUMN     "recyclingSubmissionId" TEXT,
ADD COLUMN     "redemptionId" TEXT;

-- AlterTable
ALTER TABLE "UploadedFile" ADD COLUMN     "recyclingSubmissionId" TEXT,
ADD COLUMN     "rewardId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastRecyclingSubmissionAt" TIMESTAMP(3),
ADD COLUMN     "suspiciousActivityFlagged" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PointRate" (
    "material" TEXT NOT NULL,
    "ratePerKg" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PointRate_pkey" PRIMARY KEY ("material")
);

-- CreateTable
CREATE TABLE "RecyclingQrCode" (
    "id" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "status" "RecyclingQrStatus" NOT NULL DEFAULT 'ISSUED',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "issuedById" TEXT NOT NULL,
    "claimedById" TEXT,
    "claimedAt" TIMESTAMP(3),
    "invalidatedById" TEXT,
    "invalidatedAt" TIMESTAMP(3),
    "materialType" TEXT,
    "estimatedWeightKg" DOUBLE PRECISION,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecyclingQrCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecyclingSubmission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "RecyclingSubmissionSource" NOT NULL DEFAULT 'MANUAL',
    "qrCodeId" TEXT,
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

-- CreateTable
CREATE TABLE "RewardTier" (
    "tier" TEXT NOT NULL,
    "pointsRequired" INTEGER NOT NULL,

    CONSTRAINT "RewardTier_pkey" PRIMARY KEY ("tier")
);

-- CreateTable
CREATE TABLE "Reward" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pointsRequired" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "imageUploadId" TEXT,
    "category" TEXT,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tier" TEXT NOT NULL DEFAULT 'small',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Redemption" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rewardId" TEXT,
    "itemName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "pointsSpent" INTEGER NOT NULL,
    "status" "RedemptionStatus" NOT NULL DEFAULT 'RESERVED',
    "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Redemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedemptionCooldown" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "lastRedeemedAt" TIMESTAMP(3),
    "countToday" INTEGER NOT NULL DEFAULT 0,
    "countWeek" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RedemptionCooldown_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuspiciousActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "details" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuspiciousActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecyclingQrCode_nonce_key" ON "RecyclingQrCode"("nonce");

-- CreateIndex
CREATE INDEX "RecyclingQrCode_status_expiresAt_idx" ON "RecyclingQrCode"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "RecyclingQrCode_issuedById_createdAt_idx" ON "RecyclingQrCode"("issuedById", "createdAt");

-- CreateIndex
CREATE INDEX "RecyclingQrCode_claimedById_claimedAt_idx" ON "RecyclingQrCode"("claimedById", "claimedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RecyclingSubmission_qrCodeId_key" ON "RecyclingSubmission"("qrCodeId");

-- CreateIndex
CREATE INDEX "RecyclingSubmission_userId_submittedAt_idx" ON "RecyclingSubmission"("userId", "submittedAt");

-- CreateIndex
CREATE INDEX "RecyclingSubmission_status_submittedAt_idx" ON "RecyclingSubmission"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "RecyclingSubmission_materialType_idx" ON "RecyclingSubmission"("materialType");

-- CreateIndex
CREATE INDEX "RecyclingSubmission_source_submittedAt_idx" ON "RecyclingSubmission"("source", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Reward_imageUploadId_key" ON "Reward"("imageUploadId");

-- CreateIndex
CREATE INDEX "Reward_isActive_tier_idx" ON "Reward"("isActive", "tier");

-- CreateIndex
CREATE INDEX "Reward_isActive_pointsRequired_idx" ON "Reward"("isActive", "pointsRequired");

-- CreateIndex
CREATE INDEX "Redemption_userId_createdAt_idx" ON "Redemption"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Redemption_rewardId_idx" ON "Redemption"("rewardId");

-- CreateIndex
CREATE INDEX "Redemption_status_idx" ON "Redemption"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RedemptionCooldown_userId_rewardId_key" ON "RedemptionCooldown"("userId", "rewardId");

-- CreateIndex
CREATE INDEX "SuspiciousActivityLog_userId_detectedAt_idx" ON "SuspiciousActivityLog"("userId", "detectedAt");

-- CreateIndex
CREATE INDEX "SuspiciousActivityLog_severity_detectedAt_idx" ON "SuspiciousActivityLog"("severity", "detectedAt");

-- CreateIndex
CREATE INDEX "PointsEvent_userId_eventType_idx" ON "PointsEvent"("userId", "eventType");

-- CreateIndex
CREATE INDEX "PointsEvent_userId_createdAt_idx" ON "PointsEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UploadedFile_recyclingSubmissionId_idx" ON "UploadedFile"("recyclingSubmissionId");

-- CreateIndex
CREATE INDEX "UploadedFile_rewardId_idx" ON "UploadedFile"("rewardId");

-- AddForeignKey
ALTER TABLE "PointsEvent" ADD CONSTRAINT "PointsEvent_recyclingSubmissionId_fkey" FOREIGN KEY ("recyclingSubmissionId") REFERENCES "RecyclingSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointsEvent" ADD CONSTRAINT "PointsEvent_redemptionId_fkey" FOREIGN KEY ("redemptionId") REFERENCES "Redemption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecyclingQrCode" ADD CONSTRAINT "RecyclingQrCode_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecyclingQrCode" ADD CONSTRAINT "RecyclingQrCode_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecyclingQrCode" ADD CONSTRAINT "RecyclingQrCode_invalidatedById_fkey" FOREIGN KEY ("invalidatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecyclingSubmission" ADD CONSTRAINT "RecyclingSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecyclingSubmission" ADD CONSTRAINT "RecyclingSubmission_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecyclingSubmission" ADD CONSTRAINT "RecyclingSubmission_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "RecyclingQrCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reward" ADD CONSTRAINT "Reward_imageUploadId_fkey" FOREIGN KEY ("imageUploadId") REFERENCES "UploadedFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "Reward"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedemptionCooldown" ADD CONSTRAINT "RedemptionCooldown_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedemptionCooldown" ADD CONSTRAINT "RedemptionCooldown_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "Reward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuspiciousActivityLog" ADD CONSTRAINT "SuspiciousActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_recyclingSubmissionId_fkey" FOREIGN KEY ("recyclingSubmissionId") REFERENCES "RecyclingSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "Reward"("id") ON DELETE SET NULL ON UPDATE CASCADE;
