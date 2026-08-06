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

export function findAllBadges() {
  return prisma.badge.findMany({
    orderBy: { createdAt: "asc" }
  });
}

export function updateBadge(id, data) {
  return prisma.badge.update({ where: { id }, data });
}

export function findAwardsByBadge(badgeId) {
  return prisma.badgeAward.findMany({
    where: { badgeId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { awardedAt: "asc" }
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

export function countApprovedRecyclingSubmissions(userId) {
  return prisma.recyclingSubmission.count({
    where: { userId, status: "APPROVED" }
  });
}

export async function countCompletedMissions(userId) {
  const approvalStats = await prisma.missionSubmission.groupBy({
    by: ["missionId"],
    where: { userId, status: "APPROVED" },
    _count: { _all: true },
    _sum: { quantity: true }
  });

  if (approvalStats.length === 0) {
    return 0;
  }

  const missions = await prisma.mission.findMany({
    where: { id: { in: approvalStats.map((stat) => stat.missionId) } },
    select: { id: true, type: true, targetQuantity: true, targetDays: true }
  });

  const missionsById = new Map(missions.map((mission) => [mission.id, mission]));

  return approvalStats.reduce((total, stat) => {
    const mission = missionsById.get(stat.missionId);
    return total + (isMissionCompletedByApprovals(mission, stat) ? 1 : 0);
  }, 0);
}

function isMissionCompletedByApprovals(mission, approvalStat) {
  if (!mission) {
    return false;
  }

  const approvedCount = approvalStat._count._all ?? 0;
  const approvedQuantity = approvalStat._sum.quantity ?? 0;

  switch (mission.type) {
    case "QUANTITY_BASED":
      return mission.targetQuantity == null
        ? approvedCount > 0
        : approvedQuantity >= mission.targetQuantity;
    case "STREAK_BASED":
      return mission.targetDays == null
        ? approvedCount > 0
        : approvedCount >= mission.targetDays;
    case "TIME_LIMITED":
      return approvedCount > 0;
    default:
      return false;
  }
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
