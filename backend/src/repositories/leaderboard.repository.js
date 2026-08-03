import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export function findStudents(client = prisma) {
  return client.user.findMany({
    where: { role: "STUDENT" },
    select: { id: true, name: true, email: true }
  });
}

export function groupPointsByUser(where, client = prisma) {
  return client.pointsEvent.groupBy({
    by: ["userId"],
    where,
    _sum: { points: true }
  });
}

export function groupApprovedRecyclingSubmissionsByUser(where, client = prisma) {
  return client.recyclingSubmission.groupBy({
    by: ["userId"],
    where,
    _count: { _all: true }
  });
}
