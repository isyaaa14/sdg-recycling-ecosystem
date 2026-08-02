import { PrismaClient } from "@prisma/client";
import { createRewardSchema, redeemRewardSchema, updateRewardSchema } from "../validators/reward.validator.js";
import {
  createPointsEventForRewardRedemption
} from "./points.service.js";
import { sumPointsForUser } from "../repositories/points.repository.js";
import { createWithGeneratedId } from "../utils/idGenerator.js";
import {
  createRewardImageReadUrl,
  uploadRewardImage as uploadRewardImageFile,
  UploadServiceError
} from "./upload.service.js";

const prisma = new PrismaClient();
const DEFAULT_CLAIM_EXPIRY_DAYS = 30;

export class RewardServiceError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function parseId(id, label = "reward") {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new RewardServiceError(400, `Invalid ${label} id.`);
  }
  return numericId;
}

function parseCodeId(id, label) {
  const value = String(id ?? "").trim();
  if (!value) {
    throw new RewardServiceError(400, `Invalid ${label} id.`);
  }
  return value;
}

function claimExpiryDate(now = new Date()) {
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + DEFAULT_CLAIM_EXPIRY_DAYS);
  return expiresAt;
}

function cooldownHoursForReward(reward) {
  return reward.tier === "large" ? 72 : 24;
}

function sanitizeRewardPayload(payload) {
  const data = { ...payload };
  if (data.imageUrl === "") {
    data.imageUrl = null;
  }
  if (data.expiresAt) {
    data.expiresAt = new Date(data.expiresAt);
  }
  return data;
}

function includeRewardRelations() {
  return {
    imageUpload: true,
    redemptions: {
      select: { id: true, userId: true, pointsSpent: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5
    }
  };
}

function includeRedemptionRelations() {
  return {
    reward: { select: { id: true, name: true, imageUrl: true, category: true, tier: true } },
    user: { select: { id: true, name: true, email: true } },
    pointsEvents: {
      select: { id: true, points: true, eventType: true, status: true, approvedAt: true },
      orderBy: { createdAt: "desc" }
    }
  };
}

function serializeReward(reward) {
  if (!reward) return reward;
  return {
    ...reward,
    imageUrl: reward.imageUpload ? createRewardImageReadUrl(reward.imageUpload) : reward.imageUrl
  };
}

export async function listRewards(query = {}) {
  const where = {};
  if (query.includeInactive !== "true") {
    where.isActive = true;
  }
  if (query.tier) where.tier = query.tier;
  if (query.category) where.category = query.category;

  const rewards = await prisma.reward.findMany({
    where,
    include: includeRewardRelations(),
    orderBy: [{ tier: "asc" }, { pointsRequired: "asc" }, { name: "asc" }]
  });
  return rewards.map(serializeReward);
}

export async function createReward(payload) {
  const result = createRewardSchema.safeParse(payload);
  if (!result.success) {
    throw new RewardServiceError(400, "Missing or invalid parameters.");
  }

  const reward = await prisma.reward.create({
    data: sanitizeRewardPayload(result.data),
    include: includeRewardRelations()
  });
  return serializeReward(reward);
}

export async function updateReward(id, payload) {
  const rewardId = parseId(id);
  const result = updateRewardSchema.safeParse(payload);
  if (!result.success) {
    throw new RewardServiceError(400, "Missing or invalid parameters.");
  }

  const existing = await prisma.reward.findUnique({ where: { id: rewardId } });
  if (!existing) {
    throw new RewardServiceError(404, "Reward not found.");
  }

  const reward = await prisma.reward.update({
    where: { id: rewardId },
    data: sanitizeRewardPayload(result.data),
    include: includeRewardRelations()
  });
  return serializeReward(reward);
}

export async function deactivateReward(id) {
  const rewardId = parseId(id);
  const existing = await prisma.reward.findUnique({ where: { id: rewardId } });
  if (!existing) {
    throw new RewardServiceError(404, "Reward not found.");
  }

  const reward = await prisma.reward.update({
    where: { id: rewardId },
    data: { isActive: false },
    include: includeRewardRelations()
  });
  return serializeReward(reward);
}

export async function uploadRewardImage(id, fileBuffer, meta, userId) {
  const rewardId = parseId(id);
  const existing = await prisma.reward.findUnique({ where: { id: rewardId } });
  if (!existing) {
    throw new RewardServiceError(404, "Reward not found.");
  }

  let upload;
  try {
    upload = await uploadRewardImageFile(fileBuffer, meta, userId);
  } catch (error) {
    if (error instanceof UploadServiceError) {
      throw new RewardServiceError(error.statusCode, error.message);
    }
    throw error;
  }

  const reward = await prisma.reward.update({
    where: { id: rewardId },
    data: {
      imageUrl: upload.fileUrl,
      imageUploadId: upload.id,
      uploads: { connect: { id: upload.id } }
    },
    include: includeRewardRelations()
  });

  return { reward: serializeReward(reward), upload };
}

async function assertRewardCanBeRedeemed(reward, userId, quantity) {
  if (!reward || !reward.isActive) {
    throw new RewardServiceError(404, "Reward not found.");
  }

  if (reward.expiresAt && reward.expiresAt < new Date()) {
    throw new RewardServiceError(400, "Reward is expired.");
  }

  if (reward.stock < quantity) {
    throw new RewardServiceError(409, "Reward is out of stock.");
  }

  const cooldown = await prisma.redemptionCooldown.findUnique({
    where: { userId_rewardId: { userId, rewardId: reward.id } }
  });

  if (cooldown?.lastRedeemedAt) {
    const nextAvailableAt = new Date(cooldown.lastRedeemedAt);
    nextAvailableAt.setHours(nextAvailableAt.getHours() + cooldownHoursForReward(reward));
    if (nextAvailableAt > new Date()) {
      throw new RewardServiceError(429, `Reward can be redeemed again after ${nextAvailableAt.toISOString()}.`);
    }
  }
}

export async function redeemReward(id, payload, userId) {
  const rewardId = parseId(id);
  const result = redeemRewardSchema.safeParse(payload ?? {});
  if (!result.success) {
    throw new RewardServiceError(400, "Missing or invalid parameters.");
  }

  const quantity = result.data.quantity;
  const reward = await prisma.reward.findUnique({ where: { id: rewardId } });
  await assertRewardCanBeRedeemed(reward, userId, quantity);

  const cost = reward.pointsRequired * quantity;
  const currentBalance = await sumPointsForUser(userId);
  if (currentBalance < cost) {
    throw new RewardServiceError(400, "Not enough points to redeem this reward.");
  }

  const now = new Date();
  const redemption = await prisma.$transaction(async (tx) => {
    const created = await createWithGeneratedId("redemption", "RDM", (redemptionId) =>
      tx.redemption.create({
        data: {
          id: redemptionId,
          userId,
          rewardId: reward.id,
          itemName: quantity > 1 ? `${reward.name} x${quantity}` : reward.name,
          pointsSpent: cost,
          status: "claimed",
          claimedAt: now,
          expiresAt: claimExpiryDate(now)
        }
      })
    );

    await tx.reward.update({
      where: { id: reward.id },
      data: { stock: { decrement: quantity } }
    });

    await tx.redemptionCooldown.upsert({
      where: { userId_rewardId: { userId, rewardId: reward.id } },
      update: {
        lastRedeemedAt: now,
        countToday: { increment: quantity },
        countWeek: { increment: quantity }
      },
      create: {
        userId,
        rewardId: reward.id,
        lastRedeemedAt: now,
        countToday: quantity,
        countWeek: quantity
      }
    });

    return created;
  });

  await createPointsEventForRewardRedemption({
    userId,
    redemptionId: redemption.id,
    points: -cost,
    approvedAt: now
  });

  return getRedemptionById(redemption.id, { id: userId, role: "STUDENT" });
}

export function listMyRedemptions(userId) {
  return prisma.redemption.findMany({
    where: { userId },
    include: includeRedemptionRelations(),
    orderBy: { createdAt: "desc" }
  });
}

export function listRedemptions(query = {}) {
  const where = {};
  if (query.userId) where.userId = query.userId;
  if (query.rewardId) where.rewardId = parseId(query.rewardId);
  if (query.status) where.status = query.status;

  return prisma.redemption.findMany({
    where,
    include: includeRedemptionRelations(),
    orderBy: { createdAt: "desc" }
  });
}

export async function getRedemptionById(id, requestingUser) {
  const redemptionId = parseCodeId(id, "redemption");
  const redemption = await prisma.redemption.findUnique({
    where: { id: redemptionId },
    include: includeRedemptionRelations()
  });

  if (!redemption) {
    throw new RewardServiceError(404, "Redemption not found.");
  }

  if (requestingUser.role !== "ADMIN" && redemption.userId !== requestingUser.id) {
    throw new RewardServiceError(403, "You do not have permission to view this redemption.");
  }

  return redemption;
}
