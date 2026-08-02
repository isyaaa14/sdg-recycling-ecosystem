ALTER TYPE "UploadPurpose" ADD VALUE IF NOT EXISTS 'RECYCLING_PROOF';

ALTER TABLE "UploadedFile"
ADD COLUMN "recyclingSubmissionId" INTEGER;

CREATE INDEX "UploadedFile_recyclingSubmissionId_idx"
ON "UploadedFile"("recyclingSubmissionId");

ALTER TABLE "UploadedFile"
ADD CONSTRAINT "UploadedFile_recyclingSubmissionId_fkey"
FOREIGN KEY ("recyclingSubmissionId") REFERENCES "RecyclingSubmission"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
