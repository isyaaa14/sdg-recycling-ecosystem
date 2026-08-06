-- Fallback safety net for direct database edits (e.g. via DBeaver/Azure Data
-- Studio) that bypass the Express service layer, which normally creates
-- PointsEvent rows through points.service.js.
--
-- Existing coverage this migration builds on:
--   * "MissionSubmission" already has an AFTER INSERT/UPDATE trigger from
--     20260730110000_add_mission_completion_points_trigger that creates a
--     MISSION_COMPLETED PointsEvent when a submission's status is updated to
--     APPROVED and the mission's completion criteria are met. This migration
--     only replaces its function body to change the inserted row's status
--     from PENDING to SENT (see rationale below) - the QUANTITY_BASED /
--     STREAK_BASED / TIME_LIMITED completion logic is unchanged and still
--     mirrors submission.repository.js's getApprovedMissionProgressForUser +
--     submission.service.js's isMissionCompletedByProgress.
--   * The partial unique indexes required for idempotency already exist:
--       - "PointsEvent_mission_completed_user_mission_key" on
--         ("userId", "missionId", "eventType") WHERE eventType =
--         'MISSION_COMPLETED' (20260730100000_add_mission_completed_unique_index)
--       - "PointsEvent_recycling_approved_submission_key" on
--         ("recyclingSubmissionId") WHERE eventType = 'RECYCLING_APPROVED'
--         (20260803065336_add_points_event_idempotency_indexes)
--     Neither needs to be (re)created here.
--
-- New in this migration:
--   * A matching trigger for "RecyclingSubmission" - there was previously no
--     database-level fallback for direct edits to recycling submissions.
--
-- Why status = 'SENT' instead of 'PENDING':
-- The normal JS flow (points.service.js) inserts as PENDING/SENT and then
-- immediately calls dispatchPointsEvent() in the same request to push the
-- event to the external points ledger (or mark it SENT if no ledger is
-- configured). A trigger fired by a direct SQL edit has no such follow-up
-- call - nothing will ever pick up a PENDING row it creates - so it marks
-- the row SENT immediately instead of leaving it stuck.

-- 1. Resync PointsEvent_id_seq before use.
-- The JS layer (src/utils/idGenerator.js) generates PEVxxx ids by scanning
-- MAX(id) in the table rather than using this sequence, so the sequence can
-- fall behind the true max between trigger firings. Recomputing it here (same
-- technique as the original 20260730110000 migration) keeps
-- nextval() collision-free regardless of how many rows the JS layer has
-- inserted since the sequence was last touched.
CREATE SEQUENCE IF NOT EXISTS "PointsEvent_id_seq";

SELECT setval(
  '"PointsEvent_id_seq"',
  COALESCE((
    SELECT MAX(SUBSTRING(id FROM 4)::integer)
    FROM "PointsEvent"
    WHERE id ~ '^PEV[0-9]+$'
  ), 0) + 1,
  false
);

-- 2. MissionSubmission: reuse the existing trigger, only changing status.
CREATE OR REPLACE FUNCTION "create_mission_completion_points_event"()
RETURNS trigger AS $$
DECLARE
  mission_record RECORD;
  completing_submission_id TEXT;
  completing_reviewed_at TIMESTAMP(3);
  next_id TEXT;
BEGIN
  IF NEW.status <> 'APPROVED' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO mission_record
  FROM "Mission"
  WHERE id = NEW."missionId";

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "PointsEvent"
    WHERE "userId" = NEW."userId"
      AND "missionId" = NEW."missionId"
      AND "eventType" = 'MISSION_COMPLETED'
  ) THEN
    RETURN NEW;
  END IF;

  IF mission_record.type = 'QUANTITY_BASED' THEN
    IF mission_record."targetQuantity" IS NULL THEN
      SELECT id, "reviewedAt"
      INTO completing_submission_id, completing_reviewed_at
      FROM "MissionSubmission"
      WHERE "missionId" = NEW."missionId"
        AND "userId" = NEW."userId"
        AND status = 'APPROVED'
      ORDER BY "submittedAt", id
      LIMIT 1;
    ELSE
      SELECT id, "reviewedAt"
      INTO completing_submission_id, completing_reviewed_at
      FROM (
        SELECT
          id,
          "reviewedAt",
          "submittedAt",
          SUM(COALESCE(quantity, 0)) OVER (ORDER BY "submittedAt", id) AS running_quantity
        FROM "MissionSubmission"
        WHERE "missionId" = NEW."missionId"
          AND "userId" = NEW."userId"
          AND status = 'APPROVED'
      ) progress
      WHERE running_quantity >= mission_record."targetQuantity"
      ORDER BY "submittedAt", id
      LIMIT 1;
    END IF;
  ELSIF mission_record.type = 'STREAK_BASED' THEN
    IF mission_record."targetDays" IS NULL THEN
      SELECT id, "reviewedAt"
      INTO completing_submission_id, completing_reviewed_at
      FROM "MissionSubmission"
      WHERE "missionId" = NEW."missionId"
        AND "userId" = NEW."userId"
        AND status = 'APPROVED'
      ORDER BY "submittedAt", id
      LIMIT 1;
    ELSE
      SELECT id, "reviewedAt"
      INTO completing_submission_id, completing_reviewed_at
      FROM "MissionSubmission"
      WHERE "missionId" = NEW."missionId"
        AND "userId" = NEW."userId"
        AND status = 'APPROVED'
      ORDER BY "submittedAt", id
      OFFSET GREATEST(mission_record."targetDays" - 1, 0)
      LIMIT 1;
    END IF;
  ELSIF mission_record.type = 'TIME_LIMITED' THEN
    SELECT id, "reviewedAt"
    INTO completing_submission_id, completing_reviewed_at
    FROM "MissionSubmission"
    WHERE "missionId" = NEW."missionId"
      AND "userId" = NEW."userId"
      AND status = 'APPROVED'
    ORDER BY "submittedAt", id
    LIMIT 1;
  END IF;

  IF completing_submission_id IS NULL THEN
    RETURN NEW;
  END IF;

  next_id := 'PEV' || LPAD(nextval('"PointsEvent_id_seq"')::text, 3, '0');

  INSERT INTO "PointsEvent" (
    id,
    "userId",
    "missionId",
    "submissionId",
    points,
    "eventType",
    status,
    "approvedAt",
    "createdAt",
    "updatedAt"
  )
  VALUES (
    next_id,
    NEW."userId",
    NEW."missionId",
    completing_submission_id,
    mission_record.points,
    'MISSION_COMPLETED',
    'SENT',
    COALESCE(completing_reviewed_at, NOW()),
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger definition is unchanged (same name/columns/timing as
-- 20260730110000); CREATE OR REPLACE FUNCTION above is sufficient to update
-- its behavior, but this is kept idempotent in case this migration is ever
-- run against a database that doesn't have the trigger attached yet.
DROP TRIGGER IF EXISTS "mission_completion_points_event_trigger" ON "MissionSubmission";

CREATE TRIGGER "mission_completion_points_event_trigger"
AFTER INSERT OR UPDATE OF status, quantity, "reviewedAt"
ON "MissionSubmission"
FOR EACH ROW
EXECUTE FUNCTION "create_mission_completion_points_event"();

-- 3. RecyclingSubmission: new trigger, mirrors recycling.service.js's
-- reviewRecyclingSubmission -> createPointsEventForRecyclingApproval.
CREATE OR REPLACE FUNCTION "create_recycling_approval_points_event"()
RETURNS trigger AS $$
DECLARE
  next_id TEXT;
BEGIN
  IF NEW.status <> 'APPROVED' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "PointsEvent"
    WHERE "recyclingSubmissionId" = NEW.id
      AND "eventType" = 'RECYCLING_APPROVED'
  ) THEN
    RETURN NEW;
  END IF;

  next_id := 'PEV' || LPAD(nextval('"PointsEvent_id_seq"')::text, 3, '0');

  INSERT INTO "PointsEvent" (
    id,
    "userId",
    "recyclingSubmissionId",
    points,
    "eventType",
    status,
    "approvedAt",
    "createdAt",
    "updatedAt"
  )
  VALUES (
    next_id,
    NEW."userId",
    NEW.id,
    NEW."pointsAwarded",
    'RECYCLING_APPROVED',
    'SENT',
    COALESCE(NEW."reviewedAt", NOW()),
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "recycling_approval_points_event_trigger" ON "RecyclingSubmission";

CREATE TRIGGER "recycling_approval_points_event_trigger"
AFTER INSERT OR UPDATE OF status, "pointsAwarded", "reviewedAt"
ON "RecyclingSubmission"
FOR EACH ROW
EXECUTE FUNCTION "create_recycling_approval_points_event"();
