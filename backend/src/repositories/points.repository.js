import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ACTIVE_POINT_EVENT_TYPES = ["MISSION_COMPLETED"];

export function createPointsEvent(data) {
  return prisma.pointsEvent.create({ data });
}


export function findPointsEventByUserAndMission(userId, missionId, eventType) {
  return prisma.pointsEvent.findFirst({
    where: { userId, missionId, eventType }
  });
}

export function findPointsEventsByUser(userId) {
  return prisma.pointsEvent.findMany({
    where: { userId, eventType: { in: ACTIVE_POINT_EVENT_TYPES } },
    orderBy: { createdAt: "desc" }
  });
}

export async function sumPointsForUser(userId) {
  const result = await prisma.pointsEvent.aggregate({
    where: { userId, eventType: { in: ACTIVE_POINT_EVENT_TYPES } },
    _sum: { points: true }
  });
  return result._sum.points ?? 0;
}

export function findAllPointsEvents(filters) {
  return prisma.pointsEvent.findMany({
    where: { ...filters, eventType: filters.eventType ?? { in: ACTIVE_POINT_EVENT_TYPES } },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
      mission: { select: { id: true, title: true, slug: true } }
    }
  });
}

export function updatePointsEventStatus(id, data) {
  return prisma.pointsEvent.update({ where: { id }, data });
}

