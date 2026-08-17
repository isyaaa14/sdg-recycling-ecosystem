import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export function findRewards(where, includeRelations, client = prisma) {
  return client.reward.findMany({
    where,
    include: includeRelations,
    orderBy: [{ tier: "asc" }, { pointsRequired: "asc" }, { name: "asc" }]
  });
}

export function createReward(data, includeRelations, client = prisma) {
  return client.reward.create({ data, include: includeRelations });
}

export function findRewardById(id, includeRelations, client = prisma) {
  return client.reward.findUnique({ where: { id }, include: includeRelations });
}

export function updateReward(id, data, includeRelations, client = prisma) {
  return client.reward.update({ where: { id }, data, include: includeRelations });
}

export function decrementRewardStockIfAvailable(id, quantity, client = prisma) {
  return client.reward.updateMany({
    where: { id, stock: { gte: quantity } },
    data: { stock: { decrement: quantity } }
  });
}

export function incrementRewardStock(id, quantity, client = prisma) {
  return client.reward.update({ where: { id }, data: { stock: { increment: quantity } } });
}

export function findRedemptionCooldown(userId, rewardId, client = prisma) {
  return client.redemptionCooldown.findUnique({ where: { userId_rewardId: { userId, rewardId } } });
}

export function upsertRedemptionCooldown(id, userId, rewardId, now, quantity, client = prisma) {
  return client.redemptionCooldown.upsert({
    where: { userId_rewardId: { userId, rewardId } },
    update: {
      lastRedeemedAt: now,
      countToday: { increment: quantity },
      countWeek: { increment: quantity }
    },
    create: {
      id,
      userId,
      rewardId,
      lastRedeemedAt: now,
      countToday: quantity,
      countWeek: quantity
    }
  });
}

export function createRedemption(data, client = prisma) {
  return client.redemption.create({ data });
}

export function updateRedemptionIfStatus(id, expectedStatus, data, client = prisma) {
  return client.redemption.updateMany({ where: { id, status: expectedStatus }, data });
}

export function completeRedemptionIfReservedAndUnexpired(id, now, client = prisma) {
  return client.redemption.updateMany({
    where: {
      id,
      status: "RESERVED",
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
    },
    data: { status: "COMPLETED", completedAt: now }
  });
}

export function findExpiredReservedRedemptions(now, client = prisma) {
  return client.redemption.findMany({
    where: { status: "RESERVED", expiresAt: { lte: now } },
    select: {
      id: true,
      userId: true,
      rewardId: true,
      quantity: true,
      pointsSpent: true
    },
    orderBy: { expiresAt: "asc" }
  });
}

export function findRedemptionById(id, includeRelations, client = prisma) {
  return client.redemption.findUnique({ where: { id }, include: includeRelations });
}

export function findRedemptions(where, includeRelations, client = prisma) {
  return client.redemption.findMany({
    where,
    include: includeRelations,
    orderBy: { createdAt: "desc" }
  });
}

export function runInTransaction(callback) {
  return prisma.$transaction(callback);
}

// Only makes sense inside a transaction, so `client` (the `tx` handle) must
// always be passed explicitly rather than defaulting to the module `prisma`.
// Serializes concurrent redemptions for the same user so a locked balance
// re-check afterward can't race with another in-flight redemption.
export function lockUserForUpdate(userId, client) {
  return client.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
}
