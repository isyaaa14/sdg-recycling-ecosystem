import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export function createSubmission(data) {
  return prisma.missionSubmission.create({ data });
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

export function updateSubmission(id, data) {
  return prisma.missionSubmission.update({ where: { id }, data });
}
