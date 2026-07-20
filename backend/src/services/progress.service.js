import {
  findProgress,
  upsertProgress,
  findProgressByUser,
  findProgressByContent
} from "../repositories/progress.repository.js";
import { findContentById } from "../repositories/content.repository.js";
import { evaluateAndIssueBadges } from "./badge.service.js";

export class ProgressServiceError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function assertPublishedContent(contentId) {
  const content = await findContentById(contentId);
  if (!content || content.status !== "PUBLISHED") {
    throw new ProgressServiceError(404, "Content not found.");
  }
  return content;
}

export async function markContentComplete(userId, contentId) {
  await assertPublishedContent(contentId);

  const now = new Date();
  const updated = await upsertProgress(
    userId,
    contentId,
    { completed: true, completionCount: { increment: 1 }, lastActivityAt: now },
    { completed: true, completionCount: 1, lastActivityAt: now }
  );

  try {
    await evaluateAndIssueBadges(userId);
  } catch (error) {
    console.error(error);
  }

  return updated;
}

export async function applyQuizAttemptToProgress(userId, contentId, { passed, score }) {
  const now = new Date();
  const updateData = {
    quizAttemptsCount: { increment: 1 },
    latestScore: score,
    lastActivityAt: now
  };
  if (passed) {
    updateData.passedQuizCount = { increment: 1 };
  }

  return upsertProgress(userId, contentId, updateData, {
    quizAttemptsCount: 1,
    passedQuizCount: passed ? 1 : 0,
    latestScore: score,
    lastActivityAt: now
  });
}

export function listMyProgress(userId) {
  return findProgressByUser(userId);
}

export async function listProgressForContent(contentId) {
  await assertPublishedContent(contentId);
  return findProgressByContent(contentId);
}

export async function getMyProgressForContent(userId, contentId) {
  await assertPublishedContent(contentId);
  const progress = await findProgress(userId, contentId);
  return (
    progress ?? {
      userId,
      contentId,
      completed: false,
      completionCount: 0,
      quizAttemptsCount: 0,
      passedQuizCount: 0,
      latestScore: null
    }
  );
}
