import { PrismaClient } from "@prisma/client";
import { createWithGeneratedId } from "../utils/idGenerator.js";

const prisma = new PrismaClient();

export function createBadge(data) {
  return prisma.badge.create({ data });
}

export function findBadgeById(id) {
  return prisma.badge.findUnique({ where: { id } });
}

export function findBadgeBySlug(slug) {
  return prisma.badge.findUnique({ where: { slug } });
}

export function findActiveBadges() {
  return prisma.badge.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" }
  });
}

export function findBadgeAward(userId, badgeId) {
  return prisma.badgeAward.findUnique({
    where: { userId_badgeId: { userId, badgeId } }
  });
}

export function createBadgeAward(userId, badgeId) {
  return createWithGeneratedId("badgeAward", "AWD", (id) =>
    prisma.badgeAward.create({
      data: { id, userId, badgeId }
    })
  );
}

export function countApprovedMissionSubmissions(userId) {
  return prisma.missionSubmission.count({
    where: { userId, status: "APPROVED" }
  });
}

export function countPassedQuizAttempts(userId) {
  return prisma.quizAttempt.count({
    where: { userId, passed: true }
  });
}

export function countCompletedLearningProgress(userId) {
  return prisma.learningProgress.count({
    where: { userId, completed: true }
  });
}

export async function sumActivityMetric(userId) {
  const result = await prisma.learningProgress.aggregate({
    where: { userId },
    _sum: { completionCount: true }
  });
  return result._sum.completionCount ?? 0;
}
