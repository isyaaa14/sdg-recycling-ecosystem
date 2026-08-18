import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true
};

export function findAuditLogs({ where, skip, take }) {
  return prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { user: { select: userSelect } },
    skip,
    take
  });
}

export function countAuditLogs({ where }) {
  return prisma.auditLog.count({ where });
}
