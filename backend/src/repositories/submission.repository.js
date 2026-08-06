import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export function createSubmission(data, client = prisma) {
  return client.missionSubmission.create({ data });
}

export function findSubmissionById(id) {
  return prisma.missionSubmission.findUnique({
    where: { id },
    include: {
      uploads: true
    }
  });
}

export function countUserSubmissionsForMission(missionId, userId) {
  return prisma.missionSubmission.count({
    where: { missionId, userId, status: { not: "REJECTED" } }
  });
}

export function findActiveUserSubmissionForMission(missionId, userId) {
  return prisma.missionSubmission.findFirst({
    where: { missionId, userId, status: { not: "REJECTED" } },
    orderBy: { submittedAt: "desc" }
  });
}

export function findUserSubmissionForMissionByStatuses(missionId, userId, statuses) {
  return prisma.missionSubmission.findFirst({
    where: { missionId, userId, status: { in: statuses } },
    orderBy: { submittedAt: "desc" }
  });
}

export function findSubmissionsByMission(missionId) {
  return prisma.missionSubmission.findMany({
    where: { missionId },
    orderBy: { submittedAt: "desc" },
    include: {
      uploads: true
    }
  });
}

export function findAllSubmissions(filters) {
  return prisma.missionSubmission.findMany({
    where: filters,
    orderBy: { submittedAt: "desc" },
    include: {
      mission: { select: { id: true, title: true, slug: true, points: true } },
      user: { select: { id: true, name: true, email: true } },
      uploads: true
    }
  });
}

export async function getApprovedMissionProgressForUser(missionId, userId, client = prisma) {
  const result = await client.missionSubmission.aggregate({
    where: { missionId, userId, status: "APPROVED" },
    _count: { _all: true },
    _sum: { quantity: true }
  });

  return {
    approvedCount: result._count._all ?? 0,
    approvedQuantity: result._sum.quantity ?? 0
  };
}

export function updateSubmission(id, data, client = prisma) {
  return client.missionSubmission.update({ where: { id }, data });
}

// Atomic guard (mirrors recycling.repository.js's updateRecyclingSubmissionIfPending):
// the `status: "PENDING_REVIEW"` condition makes this a no-op (count: 0) for a
// submission a concurrent/duplicate review request already flipped, instead of
// the findUnique-then-update race that would let two reviews both pass an
// earlier status check.
export function updateSubmissionIfPending(id, data, client = prisma) {
  return client.missionSubmission.updateMany({
    where: { id, status: "PENDING_REVIEW" },
    data
  });
}

export function runInTransaction(callback) {
  return prisma.$transaction(callback);
}
