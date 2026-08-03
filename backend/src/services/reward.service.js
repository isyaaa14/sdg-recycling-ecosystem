import {
  cancelRedemptionSchema,
  createRewardSchema,
  redeemRewardSchema,
  updateRewardSchema
} from "../validators/reward.validator.js";
import {
  createPointsEventForRewardRedemption,
  createPointsEventForRewardRefund
} from "./points.service.js";
import { sumPointsForUser } from "../repositories/points.repository.js";
import { createWithGeneratedId } from "../utils/idGenerator.js";
import {
  createRewardImageReadUrl,
  uploadRewardImage as uploadRewardImageFile,
  UploadServiceError
} from "./upload.service.js";
import {
  createRedemption,
  createReward as createRewardRecord,
  decrementRewardStockIfAvailable,
  findRedemptionCooldown,
  findRedemptionById,
  findRedemptions,
  findRewardById,
  findRewards,
  incrementRewardStock,
  lockUserForUpdate,
  runInTransaction,
  updateRedemptionIfStatus,
  updateReward as updateRewardRecord,
  upsertRedemptionCooldown
} from "../repositories/reward.repository.js";

const DEFAULT_CLAIM_EXPIRY_DAYS = 30;

export class RewardServiceError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function parseId(id, label = "reward") {
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

  const rewards = await findRewards(where, includeRewardRelations());
  return rewards.map(serializeReward);
}

export async function createReward(payload) {
  const result = createRewardSchema.safeParse(payload);
  if (!result.success) {
    throw new RewardServiceError(400, "Missing or invalid parameters.");
  }

  const reward = await createWithGeneratedId("reward", "RWD", (id) =>
    createRewardRecord({ id, ...sanitizeRewardPayload(result.data) }, includeRewardRelations())
  );
  return serializeReward(reward);
}

export async function updateReward(id, payload) {
  const rewardId = parseId(id);
  const result = updateRewardSchema.safeParse(payload);
  if (!result.success) {
    throw new RewardServiceError(400, "Missing or invalid parameters.");
  }

  const existing = await findRewardById(rewardId);
  if (!existing) {
    throw new RewardServiceError(404, "Reward not found.");
  }

  const reward = await updateRewardRecord(rewardId, sanitizeRewardPayload(result.data), includeRewardRelations());
  return serializeReward(reward);
}

export async function deactivateReward(id) {
  const rewardId = parseId(id);
  const existing = await findRewardById(rewardId);
  if (!existing) {
    throw new RewardServiceError(404, "Reward not found.");
  }

  const reward = await updateRewardRecord(rewardId, { isActive: false }, includeRewardRelations());
  return serializeReward(reward);
}

export async function uploadRewardImage(id, fileBuffer, meta, userId) {
  const rewardId = parseId(id);
  const existing = await findRewardById(rewardId);
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

  const reward = await updateRewardRecord(
    rewardId,
    {
      imageUrl: upload.fileUrl,
      imageUploadId: upload.id,
      uploads: { connect: { id: upload.id } }
    },
    includeRewardRelations()
  );

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

  const cooldown = await findRedemptionCooldown(userId, reward.id);

  if (cooldown?.lastRedeemedAt) {
    const nextAvailableAt = new Date(cooldown.lastRedeemedAt);
    nextAvailableAt.setHours(nextAvailableAt.getHours() + cooldownHoursForReward(reward));
    if (nextAvailableAt > new Date()) {
      throw new RewardServiceError(429, `Reward can be redeemed again after ${nextAvailableAt.toISOString()}.`);
    }
  }
}

// Reserve-first flow: this reserves the reward and deducts points up front
// (status RESERVED). An admin later calls completeRedemption (pickup done)
// or cancelRedemption (refunds points + restores stock). This replaced a
// single-step "claimed" flow that had no pickup-pending state.
export async function redeemReward(id, payload, userId) {
  const rewardId = parseId(id);
  const result = redeemRewardSchema.safeParse(payload ?? {});
  if (!result.success) {
    throw new RewardServiceError(400, "Missing or invalid parameters.");
  }

  const quantity = result.data.quantity;
  const reward = await findRewardById(rewardId);
  await assertRewardCanBeRedeemed(reward, userId, quantity);

  const cost = reward.pointsRequired * quantity;
  const currentBalance = await sumPointsForUser(userId);
  if (currentBalance < cost) {
    throw new RewardServiceError(400, "Not enough points to redeem this reward.");
  }

  const now = new Date();
  const redemption = await runInTransaction(async (tx) => {
    // Row lock + re-check under the lock: the balance check above ran before
    // this transaction opened, so two concurrent redemptions (even for
    // different rewards) could both read a sufficient balance and both
    // deduct. Locking the User row serializes concurrent redemptions for the
    // same user — the second call blocks here until the first commits (or
    // rolls back), so its balance re-check below reflects the first
    // redemption's deduction.
    await lockUserForUpdate(userId, tx);
    const lockedBalance = await sumPointsForUser(userId, tx);
    if (lockedBalance < cost) {
      throw new RewardServiceError(400, "Not enough points to redeem this reward.");
    }

    // Atomic stock guard: the `stock: { gte: quantity }` condition makes the
    // decrement a no-op if a concurrent redemption already took the
    // remaining stock, instead of the earlier pre-check-then-decrement race
    // that let concurrent requests both pass and both decrement (potentially
    // below zero).
    const stockResult = await decrementRewardStockIfAvailable(reward.id, quantity, tx);
    if (stockResult.count !== 1) {
      throw new RewardServiceError(409, "Reward is out of stock.");
    }

    const created = await createWithGeneratedId("redemption", "RDM", (redemptionId) =>
      createRedemption(
        {
          id: redemptionId,
          userId,
          rewardId: reward.id,
          itemName: quantity > 1 ? `${reward.name} x${quantity}` : reward.name,
          quantity,
          pointsSpent: cost,
          status: "RESERVED",
          reservedAt: now,
          expiresAt: claimExpiryDate(now)
        },
        tx
      )
    );

    await createWithGeneratedId("redemptionCooldown", "RDC", (cooldownId) =>
      upsertRedemptionCooldown(cooldownId, userId, reward.id, now, quantity, tx)
    );

    // Deduct points inside this same transaction: if this fails (e.g. a
    // concurrent duplicate caught by the PointsEvent idempotency index), the
    // stock decrement/redemption/cooldown above roll back too, instead of
    // committing a reservation with no matching point spend.
    await createPointsEventForRewardRedemption({
      userId,
      redemptionId: created.id,
      points: -cost,
      approvedAt: now,
      client: tx
    });

    return created;
  });

  return getRedemptionById(redemption.id, { id: userId, role: "STUDENT" });
}

export async function completeRedemption(id, adminId) {
  const redemptionId = parseId(id, "redemption");

  const result = await updateRedemptionIfStatus(redemptionId, "RESERVED", {
    status: "COMPLETED",
    completedAt: new Date()
  });

  if (result.count !== 1) {
    throw new RewardServiceError(409, "Only a reserved redemption pending pickup can be completed.");
  }

  return getRedemptionById(redemptionId, { id: adminId, role: "ADMIN" });
}

export async function cancelRedemption(id, payload, requestingUser) {
  const redemptionId = parseId(id, "redemption");
  const result = cancelRedemptionSchema.safeParse(payload ?? {});
  if (!result.success) {
    throw new RewardServiceError(400, "Missing or invalid parameters.");
  }

  const existing = await findRedemptionById(redemptionId);
  if (!existing) {
    throw new RewardServiceError(404, "Redemption not found.");
  }

  if (requestingUser.role !== "ADMIN" && existing.userId !== requestingUser.id) {
    throw new RewardServiceError(403, "You do not have permission to cancel this redemption.");
  }

  const now = new Date();
  await runInTransaction(async (tx) => {
    const cancelResult = await updateRedemptionIfStatus(
      redemptionId,
      "RESERVED",
      { status: "CANCELLED", cancelledAt: now, cancelReason: result.data.reason ?? null },
      tx
    );

    if (cancelResult.count !== 1) {
      throw new RewardServiceError(409, "Only a reserved redemption pending pickup can be cancelled.");
    }

    if (existing.rewardId) {
      await incrementRewardStock(existing.rewardId, existing.quantity, tx);
    }

    await createPointsEventForRewardRefund({
      userId: existing.userId,
      redemptionId,
      points: existing.pointsSpent,
      approvedAt: now,
      client: tx
    });
  });

  return getRedemptionById(redemptionId, requestingUser);
}

export function listMyRedemptions(userId) {
  return findRedemptions({ userId }, includeRedemptionRelations());
}

export function listRedemptions(query = {}) {
  const where = {};
  if (query.userId) where.userId = query.userId;
  if (query.rewardId) where.rewardId = parseId(query.rewardId);
  if (query.status) where.status = query.status;

  return findRedemptions(where, includeRedemptionRelations());
}

export async function getRedemptionById(id, requestingUser) {
  const redemptionId = parseId(id, "redemption");
  const redemption = await findRedemptionById(redemptionId, includeRedemptionRelations());

  if (!redemption) {
    throw new RewardServiceError(404, "Redemption not found.");
  }

  if (requestingUser.role !== "ADMIN" && redemption.userId !== requestingUser.id) {
    throw new RewardServiceError(403, "You do not have permission to view this redemption.");
  }

  return redemption;
}
