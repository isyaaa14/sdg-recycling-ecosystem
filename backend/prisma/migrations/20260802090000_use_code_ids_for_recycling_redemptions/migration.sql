-- Convert recycling submission and redemption primary keys from numeric IDs
-- to readable code IDs while preserving existing child references.

ALTER TABLE "PointsEvent" DROP CONSTRAINT IF EXISTS "PointsEvent_recyclingSubmissionId_fkey";
ALTER TABLE "PointsEvent" DROP CONSTRAINT IF EXISTS "PointsEvent_redemptionId_fkey";
ALTER TABLE "UploadedFile" DROP CONSTRAINT IF EXISTS "UploadedFile_recyclingSubmissionId_fkey";

ALTER TABLE "RecyclingSubmission" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "Redemption" ALTER COLUMN "id" DROP DEFAULT;

ALTER TABLE "RecyclingSubmission"
  ALTER COLUMN "id" TYPE TEXT
  USING ('RCS' || lpad("id"::text, 3, '0'));

ALTER TABLE "UploadedFile"
  ALTER COLUMN "recyclingSubmissionId" TYPE TEXT
  USING (
    CASE
      WHEN "recyclingSubmissionId" IS NULL THEN NULL
      ELSE 'RCS' || lpad("recyclingSubmissionId"::text, 3, '0')
    END
  );

ALTER TABLE "PointsEvent"
  ALTER COLUMN "recyclingSubmissionId" TYPE TEXT
  USING (
    CASE
      WHEN "recyclingSubmissionId" IS NULL THEN NULL
      ELSE 'RCS' || lpad("recyclingSubmissionId"::text, 3, '0')
    END
  );

ALTER TABLE "Redemption"
  ALTER COLUMN "id" TYPE TEXT
  USING ('RDM' || lpad("id"::text, 3, '0'));

ALTER TABLE "PointsEvent"
  ALTER COLUMN "redemptionId" TYPE TEXT
  USING (
    CASE
      WHEN "redemptionId" IS NULL THEN NULL
      ELSE 'RDM' || lpad("redemptionId"::text, 3, '0')
    END
  );

ALTER TABLE "PointsEvent"
  ADD CONSTRAINT "PointsEvent_recyclingSubmissionId_fkey"
  FOREIGN KEY ("recyclingSubmissionId") REFERENCES "RecyclingSubmission"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PointsEvent"
  ADD CONSTRAINT "PointsEvent_redemptionId_fkey"
  FOREIGN KEY ("redemptionId") REFERENCES "Redemption"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UploadedFile"
  ADD CONSTRAINT "UploadedFile_recyclingSubmissionId_fkey"
  FOREIGN KEY ("recyclingSubmissionId") REFERENCES "RecyclingSubmission"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
