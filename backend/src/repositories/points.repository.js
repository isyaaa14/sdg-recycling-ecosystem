import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export function createPointsEvent(data) {
  return prisma.pointsEvent.create({ data });
}

export function findPointsEventBySubmissionId(submissionId) {
  return prisma.pointsEvent.findUnique({ where: { submissionId } });
}

export function findPointsEventsByUser(userId) {
  return prisma.pointsEvent.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" }
  });
}

export async function sumPointsForUser(userId) {
  const result = await prisma.pointsEvent.aggregate({
    where: { userId },
    _sum: { points: true }
  });
  return result._sum.points ?? 0;
}

export function findAllPointsEvents(filters) {
  return prisma.pointsEvent.findMany({
    where: filters,
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
