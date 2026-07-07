import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export function createMission(data) {
  return prisma.mission.create({ data });
}

export function findMissionById(id) {
  return prisma.mission.findUnique({ where: { id } });
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
    where: { isActive: true, status: "ACTIVE" },
    orderBy: { startAt: "asc" }
  });
}

export function findAllMissions(filters) {
  return prisma.mission.findMany({
    where: filters,
    orderBy: { createdAt: "desc" }
  });
}

export function updateMission(id, data) {
  return prisma.mission.update({ where: { id }, data });
}
