-- Fix recycling approval fallback points.
--
-- The previous recycling trigger copied NEW."pointsAwarded" into PointsEvent.
-- That is safe only when the Express API has already calculated points. If a
-- submission is approved by a direct DB edit/status-only update,
-- "pointsAwarded" is still its default 0, so the trigger creates a 0-point
-- event. This migration makes the DB fallback calculate and persist the
-- approved points before the PointsEvent insert.

CREATE OR REPLACE FUNCTION "prepare_recycling_approval_points"()
RETURNS trigger AS $$
DECLARE
  effective_reviewed_at TIMESTAMP(3);
  rate_per_kg INTEGER;
  raw_points INTEGER;
  daily_points INTEGER;
  remaining_points INTEGER;
BEGIN
  IF NEW.status <> 'APPROVED' THEN
    RETURN NEW;
  END IF;

  effective_reviewed_at := COALESCE(NEW."reviewedAt", NOW());
  NEW."reviewedAt" := effective_reviewed_at;

  -- API approvals already pass a calculated positive value. Keep it.
  IF NEW."pointsAwarded" > 0 THEN
    RETURN NEW;
  END IF;

  SELECT "ratePerKg" INTO rate_per_kg
  FROM "PointRate"
  WHERE material = NEW."materialType";

  IF NOT FOUND THEN
    NEW."pointsAwarded" := 0;
    RETURN NEW;
  END IF;

  raw_points := FLOOR(NEW.quantity * rate_per_kg)::integer;

  SELECT COALESCE(SUM(points), 0)::integer INTO daily_points
  FROM "PointsEvent"
  WHERE "userId" = NEW."userId"
    AND status = 'SENT'
    AND "eventType" = 'RECYCLING_APPROVED'
    AND "approvedAt" >= DATE_TRUNC('day', effective_reviewed_at)
    AND "approvedAt" < DATE_TRUNC('day', effective_reviewed_at) + INTERVAL '1 day'
    AND ("recyclingSubmissionId" IS NULL OR "recyclingSubmissionId" <> NEW.id);

  remaining_points := GREATEST(0, 1000 - daily_points);
  NEW."pointsAwarded" := LEAST(raw_points, remaining_points);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "prepare_recycling_approval_points_trigger" ON "RecyclingSubmission";

CREATE TRIGGER "prepare_recycling_approval_points_trigger"
BEFORE INSERT OR UPDATE OF status, "pointsAwarded", "reviewedAt"
ON "RecyclingSubmission"
FOR EACH ROW
EXECUTE FUNCTION "prepare_recycling_approval_points"();

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

-- Repair already-approved rows where a direct/status-only approval created a
-- positive expected value but stored 0. Uses the same daily cap as the service
-- layer, excluding the current submission's own existing event.
WITH candidates AS (
  SELECT
    rs.id,
    rs."userId",
    COALESCE(rs."reviewedAt", pe."approvedAt", rs."submittedAt", NOW()) AS effective_reviewed_at,
    FLOOR(rs.quantity * pr."ratePerKg")::integer AS raw_points
  FROM "RecyclingSubmission" rs
  JOIN "PointRate" pr ON pr.material = rs."materialType"
  LEFT JOIN "PointsEvent" pe
    ON pe."recyclingSubmissionId" = rs.id
   AND pe."eventType" = 'RECYCLING_APPROVED'
  WHERE rs.status = 'APPROVED'
    AND rs."pointsAwarded" = 0
    AND FLOOR(rs.quantity * pr."ratePerKg") > 0
),
computed AS (
  SELECT
    c.id,
    c.effective_reviewed_at,
    LEAST(
      c.raw_points,
      GREATEST(
        0,
        1000 - COALESCE((
          SELECT SUM(pe2.points)
          FROM "PointsEvent" pe2
          WHERE pe2."userId" = c."userId"
            AND pe2.status = 'SENT'
            AND pe2."eventType" = 'RECYCLING_APPROVED'
            AND pe2."approvedAt" >= DATE_TRUNC('day', c.effective_reviewed_at)
            AND pe2."approvedAt" < DATE_TRUNC('day', c.effective_reviewed_at) + INTERVAL '1 day'
            AND (pe2."recyclingSubmissionId" IS NULL OR pe2."recyclingSubmissionId" <> c.id)
        ), 0)
      )
    )::integer AS final_points
  FROM candidates c
)
UPDATE "RecyclingSubmission" rs
SET
  "pointsAwarded" = computed.final_points,
  "reviewedAt" = computed.effective_reviewed_at
FROM computed
WHERE rs.id = computed.id
  AND computed.final_points > 0;

WITH candidates AS (
  SELECT
    rs.id,
    rs."pointsAwarded",
    COALESCE(rs."reviewedAt", pe."approvedAt", rs."submittedAt", NOW()) AS effective_reviewed_at
  FROM "RecyclingSubmission" rs
  JOIN "PointsEvent" pe
    ON pe."recyclingSubmissionId" = rs.id
   AND pe."eventType" = 'RECYCLING_APPROVED'
  WHERE rs.status = 'APPROVED'
    AND rs."pointsAwarded" > 0
    AND pe.points = 0
)
UPDATE "PointsEvent" pe
SET
  points = candidates."pointsAwarded",
  "approvedAt" = candidates.effective_reviewed_at
FROM candidates
WHERE pe."recyclingSubmissionId" = candidates.id
  AND pe."eventType" = 'RECYCLING_APPROVED'
  AND pe.points = 0;
