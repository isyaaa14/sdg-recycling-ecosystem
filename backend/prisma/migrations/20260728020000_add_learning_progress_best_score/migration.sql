ALTER TABLE "LearningProgress" ADD COLUMN "bestScore" INTEGER;

UPDATE "LearningProgress"
SET "bestScore" = "latestScore"
WHERE "latestScore" IS NOT NULL AND "bestScore" IS NULL;

UPDATE "QuizQuestion"
SET "points" = 1
WHERE "points" <> 1;

ALTER TABLE "QuizQuestion"
ADD CONSTRAINT "QuizQuestion_points_one_check" CHECK ("points" = 1);
