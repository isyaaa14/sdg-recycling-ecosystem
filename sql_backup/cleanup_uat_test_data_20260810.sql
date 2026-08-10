-- Cleanup script for the 2026-08-10 backup/live UAT preparation.
-- Review first, then run against the target database after taking a fresh backup.
-- For a dry-run, change the final COMMIT to ROLLBACK.
--
-- Scope:
-- - Delete the throwaway UAT tester account(s) and directly related activity.
-- - Delete hard-coded smoke/test artifacts that should not appear in live UAT.
-- - Scrub UAT/test review notes from retained real-user activity.
-- - Leave seeded demo account removal commented because it is destructive and
--   should only be enabled for production after confirming no real users rely on it.

BEGIN;

-- 1) Remove throwaway UAT tester users and all dependent rows.
WITH test_users AS (
  SELECT id
  FROM public."User"
  WHERE email ILIKE 'uat.tester.%@student.uow.edu.my'
     OR name ILIKE 'UAT Tester %'
),
test_mission_submissions AS (
  SELECT id
  FROM public."MissionSubmission"
  WHERE "userId" IN (SELECT id FROM test_users)
     OR "proofText" ILIKE 'UAT TC-%'
),
test_recycling_submissions AS (
  SELECT id
  FROM public."RecyclingSubmission"
  WHERE "userId" IN (SELECT id FROM test_users)
     OR id ILIKE '%TEST%'
),
test_redemptions AS (
  SELECT id
  FROM public."Redemption"
  WHERE "userId" IN (SELECT id FROM test_users)
)
DELETE FROM public."PointsEvent"
WHERE "userId" IN (SELECT id FROM test_users)
   OR "submissionId" IN (SELECT id FROM test_mission_submissions)
   OR "recyclingSubmissionId" IN (SELECT id FROM test_recycling_submissions)
   OR "redemptionId" IN (SELECT id FROM test_redemptions);

WITH test_users AS (
  SELECT id
  FROM public."User"
  WHERE email ILIKE 'uat.tester.%@student.uow.edu.my'
     OR name ILIKE 'UAT Tester %'
),
test_mission_submissions AS (
  SELECT id
  FROM public."MissionSubmission"
  WHERE "userId" IN (SELECT id FROM test_users)
     OR "proofText" ILIKE 'UAT TC-%'
),
test_recycling_submissions AS (
  SELECT id
  FROM public."RecyclingSubmission"
  WHERE "userId" IN (SELECT id FROM test_users)
     OR id ILIKE '%TEST%'
)
DELETE FROM public."UploadedFile"
WHERE "userId" IN (SELECT id FROM test_users)
   OR "missionSubmissionId" IN (SELECT id FROM test_mission_submissions)
   OR "recyclingSubmissionId" IN (SELECT id FROM test_recycling_submissions);

WITH test_users AS (
  SELECT id
  FROM public."User"
  WHERE email ILIKE 'uat.tester.%@student.uow.edu.my'
     OR name ILIKE 'UAT Tester %'
)
DELETE FROM public."BadgeAward"
WHERE "userId" IN (SELECT id FROM test_users);

WITH test_users AS (
  SELECT id
  FROM public."User"
  WHERE email ILIKE 'uat.tester.%@student.uow.edu.my'
     OR name ILIKE 'UAT Tester %'
)
DELETE FROM public."LearningProgress"
WHERE "userId" IN (SELECT id FROM test_users);

WITH test_users AS (
  SELECT id
  FROM public."User"
  WHERE email ILIKE 'uat.tester.%@student.uow.edu.my'
     OR name ILIKE 'UAT Tester %'
)
DELETE FROM public."QuizAttempt"
WHERE "userId" IN (SELECT id FROM test_users);

WITH test_users AS (
  SELECT id
  FROM public."User"
  WHERE email ILIKE 'uat.tester.%@student.uow.edu.my'
     OR name ILIKE 'UAT Tester %'
)
DELETE FROM public."MissionSubmission"
WHERE "userId" IN (SELECT id FROM test_users)
   OR "proofText" ILIKE 'UAT TC-%';

WITH test_users AS (
  SELECT id
  FROM public."User"
  WHERE email ILIKE 'uat.tester.%@student.uow.edu.my'
     OR name ILIKE 'UAT Tester %'
)
DELETE FROM public."RecyclingSubmission"
WHERE "userId" IN (SELECT id FROM test_users)
   OR id ILIKE '%TEST%';

WITH test_users AS (
  SELECT id
  FROM public."User"
  WHERE email ILIKE 'uat.tester.%@student.uow.edu.my'
     OR name ILIKE 'UAT Tester %'
)
DELETE FROM public."RedemptionCooldown"
WHERE "userId" IN (SELECT id FROM test_users);

WITH test_users AS (
  SELECT id
  FROM public."User"
  WHERE email ILIKE 'uat.tester.%@student.uow.edu.my'
     OR name ILIKE 'UAT Tester %'
)
DELETE FROM public."Redemption"
WHERE "userId" IN (SELECT id FROM test_users);

WITH test_users AS (
  SELECT id
  FROM public."User"
  WHERE email ILIKE 'uat.tester.%@student.uow.edu.my'
     OR name ILIKE 'UAT Tester %'
)
DELETE FROM public."SuspiciousActivityLog"
WHERE "userId" IN (SELECT id FROM test_users);

WITH test_users AS (
  SELECT id
  FROM public."User"
  WHERE email ILIKE 'uat.tester.%@student.uow.edu.my'
     OR name ILIKE 'UAT Tester %'
)
DELETE FROM public."AdminNotification"
WHERE "targetUserId" IN (SELECT id FROM test_users);

WITH test_users AS (
  SELECT id
  FROM public."User"
  WHERE email ILIKE 'uat.tester.%@student.uow.edu.my'
     OR name ILIKE 'UAT Tester %'
)
UPDATE public."RecyclingQrCode"
SET "claimedById" = NULL,
    "claimedAt" = NULL,
    status = 'ISSUED',
    "updatedAt" = now()
WHERE "claimedById" IN (SELECT id FROM test_users);

WITH test_users AS (
  SELECT id
  FROM public."User"
  WHERE email ILIKE 'uat.tester.%@student.uow.edu.my'
     OR name ILIKE 'UAT Tester %'
)
DELETE FROM public."RecyclingQrCode"
WHERE "issuedById" IN (SELECT id FROM test_users)
   OR "invalidatedById" IN (SELECT id FROM test_users);

DELETE FROM public."User"
WHERE email ILIKE 'uat.tester.%@student.uow.edu.my'
   OR name ILIKE 'UAT Tester %';

-- 2) Remove Postman-created content/quiz artifacts.
WITH test_badges AS (
  SELECT id
  FROM public."Badge"
  WHERE name ILIKE 'Postman %'
     OR description ILIKE '%Updated by Postman%'
)
DELETE FROM public."BadgeAward"
WHERE "badgeId" IN (SELECT id FROM test_badges);

DELETE FROM public."Badge"
WHERE name ILIKE 'Postman %'
   OR description ILIKE '%Updated by Postman%';

WITH test_content AS (
  SELECT id
  FROM public."Content"
  WHERE title ILIKE 'Postman %'
     OR body ILIKE '%Educational content body created by Postman%'
     OR body ILIKE '%hiujmsdcfhjmiksdc%'
),
test_quizzes AS (
  SELECT id
  FROM public."Quiz"
  WHERE "contentId" IN (SELECT id FROM test_content)
     OR title ILIKE 'Postman %'
)
DELETE FROM public."QuizAttempt"
WHERE "quizId" IN (SELECT id FROM test_quizzes);

WITH test_content AS (
  SELECT id
  FROM public."Content"
  WHERE title ILIKE 'Postman %'
     OR body ILIKE '%Educational content body created by Postman%'
     OR body ILIKE '%hiujmsdcfhjmiksdc%'
),
test_quizzes AS (
  SELECT id
  FROM public."Quiz"
  WHERE "contentId" IN (SELECT id FROM test_content)
     OR title ILIKE 'Postman %'
)
DELETE FROM public."QuizQuestion"
WHERE "quizId" IN (SELECT id FROM test_quizzes);

WITH test_content AS (
  SELECT id
  FROM public."Content"
  WHERE title ILIKE 'Postman %'
     OR body ILIKE '%Educational content body created by Postman%'
     OR body ILIKE '%hiujmsdcfhjmiksdc%'
)
DELETE FROM public."Quiz"
WHERE "contentId" IN (SELECT id FROM test_content)
   OR title ILIKE 'Postman %';

WITH test_content AS (
  SELECT id
  FROM public."Content"
  WHERE title ILIKE 'Postman %'
     OR body ILIKE '%Educational content body created by Postman%'
     OR body ILIKE '%hiujmsdcfhjmiksdc%'
)
DELETE FROM public."LearningProgress"
WHERE "contentId" IN (SELECT id FROM test_content);

WITH test_content AS (
  SELECT id
  FROM public."Content"
  WHERE title ILIKE 'Postman %'
     OR body ILIKE '%Educational content body created by Postman%'
     OR body ILIKE '%hiujmsdcfhjmiksdc%'
)
DELETE FROM public."ContentRevision"
WHERE "contentId" IN (SELECT id FROM test_content)
   OR title ILIKE 'Postman %'
   OR body ILIKE '%hiujmsdcfhjmiksdc%';

DELETE FROM public."Content"
WHERE title ILIKE 'Postman %'
   OR body ILIKE '%Educational content body created by Postman%'
   OR body ILIKE '%hiujmsdcfhjmiksdc%';

-- 3) Scrub test/UAT notes from retained real-user activity.
UPDATE public."MissionSubmission"
SET "reviewNote" = NULL
WHERE "reviewNote" ILIKE '%UAT demo%'
   OR "reviewNote" ILIKE '%TC-%';

UPDATE public."RecyclingSubmission"
SET "reviewNote" = NULL
WHERE "reviewNote" ILIKE '%UAT data-integrity%'
   OR "reviewNote" ILIKE '%UAT demo%';

UPDATE public."RecyclingSubmission"
SET "reviewNote" = NULL
WHERE id ILIKE '%TEST%'
   OR "reviewNote" ILIKE 'test';

-- 4) Optional production-only seed/demo account cleanup.
-- Enable only after confirming these are not real UAT participants and after
-- deciding whether their historical points/submissions should be removed.
--
-- Seed/demo users found in the 2026-08-10 backup:
--   USR002 student1@student.uow.edu.my
--   USR003 student2@student.uow.edu.my
--   USR004 student3@student.uow.edu.my
--
-- Recommended: first deactivate or reset passwords through the admin/user
-- management flow. Delete only if production must launch with no demo history.

COMMIT;
