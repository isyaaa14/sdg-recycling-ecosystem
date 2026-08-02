CREATE OR REPLACE VIEW "RecyclingSubmissionReadable" AS
SELECT
  rs."id",
  rs."userId",
  u."name" AS "userName",
  u."email" AS "userEmail",
  rs."source",
  rs."qrCodeId",
  rs."status",
  rs."materialType",
  rs."quantity",
  rs."pointsAwarded",
  rs."isDuplicateFlagged",
  rs."proofImageUrl",
  rs."reviewedById",
  reviewer."name" AS "reviewedByName",
  rs."reviewNote",
  rs."submittedAt",
  rs."reviewedAt"
FROM "RecyclingSubmission" rs
LEFT JOIN "User" u ON u."id" = rs."userId"
LEFT JOIN "User" reviewer ON reviewer."id" = rs."reviewedById";
