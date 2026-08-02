CREATE TYPE "RecyclingSubmissionSource" AS ENUM ('MANUAL', 'QR');

CREATE TYPE "RecyclingQrStatus" AS ENUM ('ISSUED', 'CLAIMED', 'EXPIRED', 'INVALIDATED');

ALTER TABLE "RecyclingSubmission"
  ADD COLUMN "source" "RecyclingSubmissionSource" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "qrCodeId" TEXT;

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

CREATE UNIQUE INDEX "RecyclingQrCode_nonce_key" ON "RecyclingQrCode"("nonce");
CREATE INDEX "RecyclingQrCode_status_expiresAt_idx" ON "RecyclingQrCode"("status", "expiresAt");
CREATE INDEX "RecyclingQrCode_issuedById_createdAt_idx" ON "RecyclingQrCode"("issuedById", "createdAt");
CREATE INDEX "RecyclingQrCode_claimedById_claimedAt_idx" ON "RecyclingQrCode"("claimedById", "claimedAt");
CREATE INDEX "RecyclingSubmission_source_submittedAt_idx" ON "RecyclingSubmission"("source", "submittedAt");
CREATE UNIQUE INDEX "RecyclingSubmission_qrCodeId_key" ON "RecyclingSubmission"("qrCodeId");

ALTER TABLE "RecyclingQrCode"
  ADD CONSTRAINT "RecyclingQrCode_issuedById_fkey"
  FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RecyclingQrCode"
  ADD CONSTRAINT "RecyclingQrCode_claimedById_fkey"
  FOREIGN KEY ("claimedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RecyclingQrCode"
  ADD CONSTRAINT "RecyclingQrCode_invalidatedById_fkey"
  FOREIGN KEY ("invalidatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RecyclingSubmission"
  ADD CONSTRAINT "RecyclingSubmission_qrCodeId_fkey"
  FOREIGN KEY ("qrCodeId") REFERENCES "RecyclingQrCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
