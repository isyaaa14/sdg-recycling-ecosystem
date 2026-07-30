import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const missionFields = {
  id: true,
  slug: true,
  title: true,
  description: true,
  longDescription: true,
  imageUrl: true,
  guide: true,
  targetQuantity: true,
  targetDays: true,
  type: true,
  startAt: true,
  endAt: true,
  submissionCap: true,
  points: true,
  autoApprove: true,
  isActive: true,
  status: true,
  createdById: true,
  createdAt: true,
  updatedAt: true
};

export function createMission(data) {
  return prisma.mission.create({ data });
}

export function findMissionById(id) {
  return prisma.mission.findUnique({
    where: { id },
    select: missionFields
  });
}

export function findOverlappingMission(type, startAt, endAt, excludeId) {
  return prisma.mission.findFirst({
    where: {
      type,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
      ...(excludeId ? { id: { not: excludeId } } : {})
    }
  });
}

export function findActiveMissions() {
  return prisma.mission.findMany({
    where: {
      OR: [
        { isActive: true, status: "ACTIVE" },
        { status: "ARCHIVED" }
      ]
    },
    select: missionFields,
    orderBy: { startAt: "asc" }
  });
}

export function findAllMissions(filters) {
  return prisma.mission.findMany({
    where: filters,
    select: missionFields,
    orderBy: { createdAt: "desc" }
  });
}

export function updateMission(id, data) {
  return prisma.mission.update({ where: { id }, data });
}
