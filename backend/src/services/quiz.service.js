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

const MIN_QUIZ_QUESTIONS = 5;
const MAX_QUIZ_QUESTIONS = 10;

function stripAnswers(quiz) {
  return {
    ...quiz,
    questions: quiz.questions.map(({ correctAnswer: _correctAnswer, ...question }) => question)
  };
}

function assertQuizHasValidQuestionCount(quiz) {
  const questionCount = quiz.questions.length;
  if (questionCount < MIN_QUIZ_QUESTIONS || questionCount > MAX_QUIZ_QUESTIONS) {
    throw new QuizServiceError(400, "Quiz must have 5 to 10 questions.");
  }
  if (quiz.passingScore < 1 || quiz.passingScore > questionCount) {
    throw new QuizServiceError(400, "Quiz passing score must fit the number of questions.");
  }
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

  if (result.data.passingScore !== undefined && existing.questions.length > 0) {
    if (result.data.passingScore > existing.questions.length) {
      throw new QuizServiceError(400, "Quiz passing score must fit the number of questions.");
    }
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
  if (quiz.questions.length >= MAX_QUIZ_QUESTIONS) {
    throw new QuizServiceError(409, "Quiz cannot have more than 10 questions.");
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
      points: 1
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

  return updateQuizQuestionRecord(questionId, { ...result.data, points: 1 });
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
    assertQuizHasValidQuestionCount(quiz);
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
  assertQuizHasValidQuestionCount(quiz);

  const { answers, timeSpentSeconds } = result.data;
  let totalPoints = 0;
  let earnedPoints = 0;
  let correctAnswers = 0;
  const reviewQuestions = [];

  for (const question of quiz.questions) {
    totalPoints += 1;
    const selectedAnswer = answers[question.code] ?? null;
    const isCorrect = selectedAnswer === question.correctAnswer;
    if (isCorrect) {
      earnedPoints += 1;
      correctAnswers += 1;
    }
    reviewQuestions.push({
      id: question.id,
      code: question.code,
      questionText: question.questionText,
      options: question.options,
      correctAnswer: question.correctAnswer,
      selectedAnswer,
      isCorrect,
      wasSkipped: selectedAnswer === null
    });
  }

  const score = earnedPoints;
  const accuracy = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
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
      answers,
      ...(timeSpentSeconds !== undefined ? { timeSpentSeconds } : {})
    })
  );

  let progressResult = null;
  try {
    progressResult = await applyQuizAttemptToProgress(userId, quiz.contentId, { passed, score });
  } catch (error) {
    console.error(error);
  }

  try {
    await evaluateAndIssueBadges(userId);
  } catch (error) {
    console.error(error);
  }

  return {
    attempt,
    result: {
      score,
      totalQuestions: quiz.questions.length,
      correctAnswers,
      accuracy,
      passed,
      timeSpentSeconds: timeSpentSeconds ?? null,
      bestScore: progressResult?.progress?.bestScore ?? score,
      previousBestScore: progressResult?.previousBestScore ?? null,
      isNewBestScore: progressResult?.isNewBestScore ?? false
    },
    review: {
      questions: reviewQuestions
    }
  };
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
