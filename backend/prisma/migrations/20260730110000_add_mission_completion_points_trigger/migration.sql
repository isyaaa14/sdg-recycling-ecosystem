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
    'PENDING',
    COALESCE(completing_reviewed_at, NOW()),
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "mission_completion_points_event_trigger" ON "MissionSubmission";

CREATE TRIGGER "mission_completion_points_event_trigger"
AFTER INSERT OR UPDATE OF status, quantity, "reviewedAt"
ON "MissionSubmission"
FOR EACH ROW
EXECUTE FUNCTION "create_mission_completion_points_event"();
