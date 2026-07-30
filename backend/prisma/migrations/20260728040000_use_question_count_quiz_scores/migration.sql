ALTER TABLE "Quiz" ALTER COLUMN "passingScore" SET DEFAULT 4;

UPDATE "Quiz" AS q
SET "passingScore" = GREATEST(1, CEIL(question_counts."questionCount" * 0.7)::INT)
FROM (
  SELECT "quizId", COUNT(*) AS "questionCount"
  FROM "QuizQuestion"
  GROUP BY "quizId"
) AS question_counts
WHERE q."id" = question_counts."quizId";

UPDATE "QuizAttempt"
SET "score" = "correctAnswers"
WHERE "score" > "totalQuestions";

UPDATE "QuizAttempt" AS qa
SET "passed" = qa."score" >= q."passingScore"
FROM "Quiz" AS q
WHERE qa."quizId" = q."id";

WITH latest_attempts AS (
  SELECT
    qa."userId",
    q."contentId",
    qa."score",
    ROW_NUMBER() OVER (PARTITION BY qa."userId", q."contentId" ORDER BY qa."attemptedAt" DESC) AS "rowNumber",
    MAX(qa."score") OVER (PARTITION BY qa."userId", q."contentId") AS "bestScore",
    SUM(CASE WHEN qa."passed" THEN 1 ELSE 0 END) OVER (PARTITION BY qa."userId", q."contentId") AS "passedQuizCount"
  FROM "QuizAttempt" AS qa
  JOIN "Quiz" AS q ON q."id" = qa."quizId"
)
UPDATE "LearningProgress" AS lp
SET
  "latestScore" = latest_attempts."score",
  "bestScore" = latest_attempts."bestScore",
  "passedQuizCount" = latest_attempts."passedQuizCount"
FROM latest_attempts
WHERE
  lp."userId" = latest_attempts."userId"
  AND lp."contentId" = latest_attempts."contentId"
  AND latest_attempts."rowNumber" = 1;

WITH passed_content AS (
  SELECT DISTINCT qa."userId", q."contentId"
  FROM "QuizAttempt" AS qa
  JOIN "Quiz" AS q ON q."id" = qa."quizId"
  WHERE qa."passed" = true
)
UPDATE "LearningProgress" AS lp
SET
  "completed" = true,
  "completionCount" = CASE WHEN lp."completionCount" > 0 THEN lp."completionCount" ELSE 1 END
FROM passed_content
WHERE lp."userId" = passed_content."userId" AND lp."contentId" = passed_content."contentId";
