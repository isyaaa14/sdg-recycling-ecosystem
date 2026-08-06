DROP INDEX IF EXISTS "PointsEvent_submissionId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "PointsEvent_mission_completed_user_mission_key"
ON "PointsEvent" ("userId", "missionId", "eventType")
WHERE "eventType" = 'MISSION_COMPLETED' AND "missionId" IS NOT NULL;
