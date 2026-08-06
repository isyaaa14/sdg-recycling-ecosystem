import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ACTIVE_POINT_EVENT_TYPES = [
  "MISSION_COMPLETED",
  "RECYCLING_APPROVED",
  "REWARD_REDEEMED",
  "REWARD_REFUNDED",
  "ADMIN_ADJUSTMENT"
];

const LIFETIME_POINT_EVENT_TYPES = ["MISSION_COMPLETED", "RECYCLING_APPROVED", "ADMIN_ADJUSTMENT"];

export function createPointsEvent(data, client = prisma) {
  return client.pointsEvent.create({ data });
}


export function findPointsEventByUserAndMission(userId, missionId, eventType, client = prisma) {
  return client.pointsEvent.findFirst({
    where: { userId, missionId, eventType }
  });
}

export function findPointsEventByRecyclingSubmission(recyclingSubmissionId, eventType = "RECYCLING_APPROVED", client = prisma) {
  return client.pointsEvent.findFirst({
    where: { recyclingSubmissionId, eventType }
  });
}

export function findPointsEventByRedemption(redemptionId, eventType = "REWARD_REDEEMED", client = prisma) {
  return client.pointsEvent.findFirst({
    where: { redemptionId, eventType }
  });
}

export function findPointsEventByRedemptionRefund(redemptionId, client = prisma) {
  return findPointsEventByRedemption(redemptionId, "REWARD_REFUNDED", client);
}

export function findPointsEventsByUser(userId) {
  return prisma.pointsEvent.findMany({
    where: { userId, eventType: { in: ACTIVE_POINT_EVENT_TYPES } },
    orderBy: { createdAt: "desc" }
  });
}

export async function sumPointsForUser(userId, client = prisma) {
  const result = await client.pointsEvent.aggregate({
    where: { userId, status: "SENT", eventType: { in: ACTIVE_POINT_EVENT_TYPES } },
    _sum: { points: true }
  });
  return result._sum.points ?? 0;
}

export async function sumLifetimePointsForUser(userId) {
  const result = await prisma.pointsEvent.aggregate({
    where: {
      userId,
      status: "SENT",
      eventType: { in: LIFETIME_POINT_EVENT_TYPES },
      points: { gt: 0 }
    },
    _sum: { points: true }
  });
  return result._sum.points ?? 0;
}

export async function sumDailyRecyclingPointsForUser(userId, date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const result = await prisma.pointsEvent.aggregate({
    where: {
      userId,
      status: "SENT",
      eventType: "RECYCLING_APPROVED",
      approvedAt: { gte: start, lt: end }
    },
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
      mission: { select: { id: true, title: true, slug: true } },
      recyclingSubmission: { select: { id: true, materialType: true, quantity: true, status: true } },
      redemption: { select: { id: true, itemName: true, pointsSpent: true, status: true } }
    }
  });
}

export function updatePointsEventStatus(id, data) {
  return prisma.pointsEvent.update({ where: { id }, data });
}

