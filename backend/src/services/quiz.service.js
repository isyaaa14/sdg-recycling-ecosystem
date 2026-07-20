import {
  createQuizSchema,
  updateQuizSchema,
  addQuestionSchema,
  updateQuestionSchema,
  submitAttemptSchema
} from "../validators/quiz.validator.js";
import {
  createQuiz as createQuizRecord,
  findQuizById,
  findQuizBySlug,
  findAllQuizzes,
  updateQuiz as updateQuizRecord,
  createQuizQuestion,
  findQuestionById,
  updateQuizQuestion as updateQuizQuestionRecord,
  deleteQuizQuestion as deleteQuizQuestionRecord,
  createQuizAttempt,
  findAttemptsByQuizAndUser,
  findAttemptsByQuiz
} from "../repositories/quiz.repository.js";
import { findContentById } from "../repositories/content.repository.js";
import { slugify } from "../utils/slugify.js";
import { createWithGeneratedId } from "../utils/idGenerator.js";
import { applyQuizAttemptToProgress } from "./progress.service.js";
import { evaluateAndIssueBadges } from "./badge.service.js";

export class QuizServiceError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function stripAnswers(quiz) {
  return {
    ...quiz,
    questions: quiz.questions.map(({ correctAnswer: _correctAnswer, ...question }) => question)
  };
}

async function assertPublishedContentForQuiz(quiz) {
  const content = await findContentById(quiz.contentId);
  if (!content || content.status !== "PUBLISHED") {
    throw new QuizServiceError(404, "Quiz not found.");
  }
}

export async function createQuiz(payload) {
  const result = createQuizSchema.safeParse(payload);
  if (!result.success) {
    throw new QuizServiceError(400, "Missing or invalid parameters.");
  }

  const data = result.data;

  const content = await findContentById(data.contentId);
  if (!content) {
    throw new QuizServiceError(404, "Content not found.");
  }

  const slug = slugify(data.title);
  const existing = await findQuizBySlug(slug);
  if (existing) {
    throw new QuizServiceError(409, "Quiz with this title already exists.");
  }

  return createWithGeneratedId("quiz", "QZ", (id) =>
    createQuizRecord({
      id,
      contentId: data.contentId,
      slug,
      title: data.title,
      ...(data.passingScore !== undefined ? { passingScore: data.passingScore } : {})
    })
  );
}

export async function updateQuiz(id, payload) {
  const result = updateQuizSchema.safeParse(payload);
  if (!result.success) {
    throw new QuizServiceError(400, "Missing or invalid parameters.");
  }

  const existing = await findQuizById(id);
  if (!existing) {
    throw new QuizServiceError(404, "Quiz not found.");
  }

  return updateQuizRecord(id, result.data);
}

export async function addQuestion(quizId, payload) {
  const result = addQuestionSchema.safeParse(payload);
  if (!result.success) {
    throw new QuizServiceError(400, "Missing or invalid parameters.");
  }

  const quiz = await findQuizById(quizId);
  if (!quiz) {
    throw new QuizServiceError(404, "Quiz not found.");
  }

  const data = result.data;
  const code = `${quiz.slug}-q${quiz.questions.length + 1}`;

  return createWithGeneratedId("quizQuestion", "QQ", (id) =>
    createQuizQuestion({
      id,
      quizId,
      code,
      questionText: data.questionText,
      options: data.options,
      correctAnswer: data.correctAnswer,
      ...(data.points !== undefined ? { points: data.points } : {})
    })
  );
}

export async function updateQuestion(quizId, questionId, payload) {
  const result = updateQuestionSchema.safeParse(payload);
  if (!result.success) {
    throw new QuizServiceError(400, "Missing or invalid parameters.");
  }

  const question = await findQuestionById(questionId);
  if (!question || question.quizId !== quizId) {
    throw new QuizServiceError(404, "Question not found.");
  }

  return updateQuizQuestionRecord(questionId, result.data);
}

export async function deleteQuestion(quizId, questionId) {
  const question = await findQuestionById(questionId);
  if (!question || question.quizId !== quizId) {
    throw new QuizServiceError(404, "Question not found.");
  }

  return deleteQuizQuestionRecord(questionId);
}

export async function getQuizById(id, user) {
  const quiz = await findQuizById(id);
  if (!quiz) {
    throw new QuizServiceError(404, "Quiz not found.");
  }

  if (user?.role !== "ADMIN") {
    await assertPublishedContentForQuiz(quiz);
    return stripAnswers(quiz);
  }

  return quiz;
}

export function listQuizzes(query = {}) {
  const filters = {};
  if (query.contentId) filters.contentId = query.contentId;
  return findAllQuizzes(filters);
}

export async function submitQuizAttempt(quizId, payload, userId) {
  const result = submitAttemptSchema.safeParse(payload);
  if (!result.success) {
    throw new QuizServiceError(400, "Missing or invalid parameters.");
  }

  const quiz = await findQuizById(quizId);
  if (!quiz) {
    throw new QuizServiceError(404, "Quiz not found.");
  }
  await assertPublishedContentForQuiz(quiz);

  const { answers } = result.data;
  let totalPoints = 0;
  let earnedPoints = 0;
  let correctAnswers = 0;

  for (const question of quiz.questions) {
    totalPoints += question.points;
    if (answers[question.code] === question.correctAnswer) {
      earnedPoints += question.points;
      correctAnswers += 1;
    }
  }

  const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  const passed = score >= quiz.passingScore;

  const attempt = await createWithGeneratedId("quizAttempt", "QAT", (id) =>
    createQuizAttempt({
      id,
      quizId,
      userId,
      score,
      totalQuestions: quiz.questions.length,
      correctAnswers,
      passed,
      answers
    })
  );

  try {
    await applyQuizAttemptToProgress(userId, quiz.contentId, { passed, score });
  } catch (error) {
    console.error(error);
  }

  try {
    await evaluateAndIssueBadges(userId);
  } catch (error) {
    console.error(error);
  }

  return attempt;
}

export async function listMyAttempts(quizId, userId) {
  const quiz = await findQuizById(quizId);
  if (!quiz) {
    throw new QuizServiceError(404, "Quiz not found.");
  }

  return findAttemptsByQuizAndUser(quizId, userId);
}

export async function listQuizAttempts(quizId) {
  const quiz = await findQuizById(quizId);
  if (!quiz) {
    throw new QuizServiceError(404, "Quiz not found.");
  }

  const attempts = await findAttemptsByQuiz(quizId);
  const attemptCount = attempts.length;
  const passCount = attempts.filter((attempt) => attempt.passed).length;

  return {
    attempts,
    stats: {
      attemptCount,
      passCount,
      passRate: attemptCount > 0 ? passCount / attemptCount : 0,
      avgScore: attemptCount > 0 ? attempts.reduce((sum, attempt) => sum + attempt.score, 0) / attemptCount : 0
    }
  };
}
