-- Idempotency guards: at most one RECYCLING_APPROVED points event per recycling
-- submission, and at most one REWARD_REDEEMED / REWARD_REFUNDED points event per
-- redemption. Expressed as partial unique indexes since Prisma's schema DSL
-- cannot declare a filtered unique constraint directly. Split into its own
-- migration because the enum values these WHERE clauses reference (added in
-- the previous migration) must be committed before Postgres allows them to be
-- used in a new object.
CREATE UNIQUE INDEX "PointsEvent_recycling_approved_submission_key"
  ON "PointsEvent" ("recyclingSubmissionId")
  WHERE "eventType" = 'RECYCLING_APPROVED' AND "recyclingSubmissionId" IS NOT NULL;

CREATE UNIQUE INDEX "PointsEvent_reward_redeemed_redemption_key"
  ON "PointsEvent" ("redemptionId")
  WHERE "eventType" = 'REWARD_REDEEMED' AND "redemptionId" IS NOT NULL;

CREATE UNIQUE INDEX "PointsEvent_reward_refunded_redemption_key"
  ON "PointsEvent" ("redemptionId")
  WHERE "eventType" = 'REWARD_REFUNDED' AND "redemptionId" IS NOT NULL;
