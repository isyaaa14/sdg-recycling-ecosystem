import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export function findInactiveStudentCandidates(cutoffDate, client = prisma) {
  return client.user.findMany({
    where: {
      role: "STUDENT",
      isActive: true,
      OR: [
        { lastRecyclingSubmissionAt: { lt: cutoffDate } },
        { AND: [{ lastRecyclingSubmissionAt: null }, { createdAt: { lt: cutoffDate } }] }
      ]
    },
    select: { id: true, name: true, email: true }
  });
}

export function deactivateUser(userId, reason, client = prisma) {
  return client.user.update({
    where: { id: userId },
    data: { isActive: false, deactivatedAt: new Date(), deactivationReason: reason }
  });
}

export function reactivateUser(userId, client = prisma) {
  return client.user.update({
    where: { id: userId },
    data: {
      isActive: true,
      deactivatedAt: null,
      deactivationReason: null,
      lastRecyclingSubmissionAt: new Date()
    }
  });
}

export function findUserById(userId, client = prisma) {
  return client.user.findUnique({ where: { id: userId } });
}

export function createAdminNotification(data, client = prisma) {
  return client.adminNotification.create({ data });
}

export function findUnreadAdminNotifications(client = prisma) {
  return client.adminNotification.findMany({
    where: { isRead: false },
    orderBy: { createdAt: "desc" },
    include: { targetUser: { select: { id: true, name: true, email: true } } }
  });
}

export function markAdminNotificationsRead(ids, adminId, client = prisma) {
  return client.adminNotification.updateMany({
    where: { id: { in: ids }, isRead: false },
    data: { isRead: true, readAt: new Date(), readById: adminId }
  });
}

export function runInTransaction(callback) {
  return prisma.$transaction(callback);
}
