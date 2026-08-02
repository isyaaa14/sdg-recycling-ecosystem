import { PrismaClient } from "@prisma/client";
import { sumDailyRecyclingPointsForUser } from "../repositories/points.repository.js";

const prisma = new PrismaClient();

export const antiGamingRules = {
  duplicateWindowSeconds: 5 * 60,
  minimumSubmissionIntervalSeconds: 60,
  maxDailyPoints: 1000,
  maxSubmissionsPerHour: 10
};

export class AntiGamingServiceError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function secondsBetween(date, now = new Date()) {
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
}

export async function getPointRate(materialType) {
  return prisma.pointRate.findUnique({ where: { material: materialType } });
}

export async function logSuspiciousActivity(userId, activityType, severity, details, flagUser = true) {
  return prisma.$transaction(async (tx) => {
    const log = await tx.suspiciousActivityLog.create({
      data: { userId, activityType, severity, details }
    });

    if (flagUser) {
      await tx.user.update({
        where: { id: userId },
        data: { suspiciousActivityFlagged: true }
      });
    }

    return log;
  });
}

export async function getAntiGamingStatus(userId) {
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const [user, dailyPoints, submissionsThisHour] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, suspiciousActivityFlagged: true, lastRecyclingSubmissionAt: true }
    }),
    sumDailyRecyclingPointsForUser(userId, now),
    prisma.recyclingSubmission.count({
      where: { userId, submittedAt: { gte: hourAgo } }
    })
  ]);

  if (!user) {
    throw new AntiGamingServiceError(404, "User not found.");
  }

  const secondsSinceLastSubmission = user.lastRecyclingSubmissionAt
    ? secondsBetween(user.lastRecyclingSubmissionAt, now)
    : Number.MAX_SAFE_INTEGER;

  return {
    suspiciousActivityFlagged: user.suspiciousActivityFlagged,
    dailyPoints,
    remainingDailyPoints: Math.max(0, antiGamingRules.maxDailyPoints - dailyPoints),
    submissionsThisHour,
    maxSubmissionsPerHour: antiGamingRules.maxSubmissionsPerHour,
    secondsUntilNextSubmission: Math.max(
      0,
      antiGamingRules.minimumSubmissionIntervalSeconds - secondsSinceLastSubmission
    ),
    maxDailyPoints: antiGamingRules.maxDailyPoints
  };
}

export async function validateRecyclingSubmission(userId, materialType, quantity) {
  const now = new Date();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, suspiciousActivityFlagged: true, lastRecyclingSubmissionAt: true }
  });

  if (!user) {
    throw new AntiGamingServiceError(404, "User not found.");
  }

  if (user.suspiciousActivityFlagged) {
    throw new AntiGamingServiceError(
      403,
      "Your account has been flagged for suspicious activity. Please contact your administrator."
    );
  }

  const rate = await getPointRate(materialType);
  if (!rate) {
    throw new AntiGamingServiceError(400, "Unsupported recycling material.");
  }

  if (user.lastRecyclingSubmissionAt) {
    const secondsSinceLastSubmission = secondsBetween(user.lastRecyclingSubmissionAt, now);
    if (secondsSinceLastSubmission < antiGamingRules.minimumSubmissionIntervalSeconds) {
      throw new AntiGamingServiceError(
        429,
        `Too soon. Please wait ${antiGamingRules.minimumSubmissionIntervalSeconds - secondsSinceLastSubmission}s before submitting again.`
      );
    }
  }

  const duplicateSince = new Date(now.getTime() - antiGamingRules.duplicateWindowSeconds * 1000);
  const margin = Math.max(quantity * 0.1, 0.01);
  const duplicate = await prisma.recyclingSubmission.findFirst({
    where: {
      userId,
      materialType,
      status: { not: "REJECTED" },
      submittedAt: { gte: duplicateSince },
      quantity: { gte: quantity - margin, lte: quantity + margin }
    }
  });

  if (duplicate) {
    await logSuspiciousActivity(
      userId,
      "duplicate_submission",
      "medium",
      `Duplicate: ${quantity}kg of ${materialType} submitted within the 5-minute window.`
    );
    throw new AntiGamingServiceError(409, "Duplicate submission detected. Please wait before resubmitting the same item.");
  }

  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const submissionsThisHour = await prisma.recyclingSubmission.count({
    where: { userId, submittedAt: { gte: hourAgo } }
  });

  if (submissionsThisHour >= antiGamingRules.maxSubmissionsPerHour) {
    await logSuspiciousActivity(
      userId,
      "hourly_limit_exceeded",
      "high",
      `Made ${submissionsThisHour} submissions in one hour. Limit: ${antiGamingRules.maxSubmissionsPerHour}.`
    );
    throw new AntiGamingServiceError(429, "Hourly submission limit reached. Please try again later.");
  }

  const estimatedPoints = Math.floor(quantity * rate.ratePerKg);
  const dailyPoints = await sumDailyRecyclingPointsForUser(userId, now);
  const projectedTotal = dailyPoints + estimatedPoints;

  if (estimatedPoints > antiGamingRules.maxDailyPoints) {
    await logSuspiciousActivity(
      userId,
      "oversized_submission",
      "high",
      `Attempted ${quantity}kg of ${materialType}, estimated ${estimatedPoints} points.`
    );
    throw new AntiGamingServiceError(400, "Submission is too large and exceeds the daily point limit.");
  }

  if (projectedTotal > antiGamingRules.maxDailyPoints) {
    throw new AntiGamingServiceError(400, "This submission would exceed your daily point limit.");
  }

  return { ratePerKg: rate.ratePerKg, estimatedPoints };
}

export async function listSuspiciousActivities(query = {}) {
  const where = {};
  if (query.userId) where.userId = query.userId;
  if (query.severity) where.severity = query.severity;

  return prisma.suspiciousActivityLog.findMany({
    where,
    orderBy: { detectedAt: "desc" },
    include: { user: { select: { id: true, name: true, email: true, suspiciousActivityFlagged: true } } }
  });
}

export async function setUserSuspiciousFlag(userId, flagged, reason, adminId) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { suspiciousActivityFlagged: flagged },
    select: { id: true, name: true, email: true, suspiciousActivityFlagged: true }
  });

  if (reason) {
    await prisma.suspiciousActivityLog.create({
      data: {
        userId,
        activityType: flagged ? "manual_flag" : "manual_unflag",
        severity: flagged ? "high" : "low",
        details: `${reason} (admin: ${adminId})`
      }
    });
  }

  return user;
}
