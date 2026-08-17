import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
      deactivationReason: null
    }
  });
}

export function findUserById(userId, client = prisma) {
  return client.user.findUnique({ where: { id: userId } });
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
