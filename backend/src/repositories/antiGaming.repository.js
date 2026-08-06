import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export function findPointRate(material, client = prisma) {
  return client.pointRate.findUnique({ where: { material } });
}

export function createSuspiciousActivityLog(data, client = prisma) {
  return client.suspiciousActivityLog.create({ data });
}

export function setUserSuspiciousFlag(userId, flagged, client = prisma) {
  return client.user.update({
    where: { id: userId },
    data: { suspiciousActivityFlagged: flagged },
    select: { id: true, name: true, email: true, suspiciousActivityFlagged: true }
  });
}

export function findUserForAntiGaming(userId, client = prisma) {
  return client.user.findUnique({
    where: { id: userId },
    select: { id: true, suspiciousActivityFlagged: true, lastRecyclingSubmissionAt: true }
  });
}

export function countRecyclingSubmissionsSince(userId, since, client = prisma) {
  return client.recyclingSubmission.count({ where: { userId, submittedAt: { gte: since } } });
}

export function findSimilarRecentSubmission(userId, materialType, since, minQuantity, maxQuantity, client = prisma) {
  return client.recyclingSubmission.findFirst({
    where: {
      userId,
      materialType,
      status: { not: "REJECTED" },
      submittedAt: { gte: since },
      quantity: { gte: minQuantity, lte: maxQuantity }
    }
  });
}

export function findSuspiciousActivities(where, client = prisma) {
  return client.suspiciousActivityLog.findMany({
    where,
    orderBy: { detectedAt: "desc" },
    include: { user: { select: { id: true, name: true, email: true, suspiciousActivityFlagged: true } } }
  });
}

export function runInTransaction(callback) {
  return prisma.$transaction(callback);
}
