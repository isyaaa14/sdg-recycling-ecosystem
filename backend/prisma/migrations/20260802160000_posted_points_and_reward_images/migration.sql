DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'SENT'
      AND enumtypid = '"PointsEventStatus"'::regtype
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'POSTED'
      AND enumtypid = '"PointsEventStatus"'::regtype
  ) THEN
    ALTER TYPE "PointsEventStatus" RENAME VALUE 'SENT' TO 'POSTED';
  END IF;
END $$;

ALTER TABLE "PointsEvent"
  ALTER COLUMN "status" SET DEFAULT 'POSTED';

ALTER TYPE "UploadPurpose" ADD VALUE IF NOT EXISTS 'REWARD_IMAGE';

ALTER TABLE "Reward"
  ADD COLUMN "imageUploadId" TEXT;

ALTER TABLE "UploadedFile"
  ADD COLUMN "rewardId" INTEGER;

CREATE UNIQUE INDEX "Reward_imageUploadId_key" ON "Reward"("imageUploadId");
CREATE INDEX "UploadedFile_rewardId_idx" ON "UploadedFile"("rewardId");

ALTER TABLE "Reward"
  ADD CONSTRAINT "Reward_imageUploadId_fkey"
  FOREIGN KEY ("imageUploadId") REFERENCES "UploadedFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UploadedFile"
  ADD CONSTRAINT "UploadedFile_rewardId_fkey"
  FOREIGN KEY ("rewardId") REFERENCES "Reward"("id") ON DELETE SET NULL ON UPDATE CASCADE;
