import {
  createPointsEvent,
  findPointsEventByUserAndMission,
  findPointsEventByRecyclingSubmission,
  findPointsEventByRedemption,
  findPointsEventByRedemptionRefund,
  findPointsEventsByUser,
  sumPointsForUser,
  sumLifetimePointsForUser,
  findAllPointsEvents,
  updatePointsEventStatus
} from "../repositories/points.repository.js";
import { createWithGeneratedId } from "../utils/idGenerator.js";
import { config } from "../utils/config.js";

export class PointsServiceError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function dispatchPointsEvent(event) {
  if (!config.pointsLedgerUrl) {
    return event.status === "SENT"
      ? event
      : updatePointsEventStatus(event.id, { status: "SENT", lastAttemptAt: new Date(), errorMessage: null });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.pointsLedgerTimeoutMs);

    const response = await fetch(config.pointsLedgerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: event.userId, points: event.points, eventType: event.eventType }),
      signal: controller.signal
    });
    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`Ledger responded with status ${response.status}`);
    }

    return updatePointsEventStatus(event.id, { status: "SENT", lastAttemptAt: new Date(), errorMessage: null });
  } catch (error) {
    return updatePointsEventStatus(event.id, {
      status: "FAILED",
      lastAttemptAt: new Date(),
      errorMessage: error.message
    });
  }
}

export async function createPointsEventForMissionCompletion({ userId, missionId, submissionId, points }) {
  const existingForMission = await findPointsEventByUserAndMission(userId, missionId, "MISSION_COMPLETED");
  if (existingForMission) {
    return ["PENDING", "FAILED"].includes(existingForMission.status)
      ? dispatchPointsEvent(existingForMission)
      : existingForMission;
  }

  const event = await createWithGeneratedId("pointsEvent", "PEV", (id) =>
    createPointsEvent({
      id,
      userId,
      missionId,
      submissionId,
      points,
      eventType: "MISSION_COMPLETED",
      status: config.pointsLedgerUrl ? "PENDING" : "SENT",
      approvedAt: new Date()
    })
  );

  return dispatchPointsEvent(event);
}

// `client` lets this run inside a caller's `$transaction` (recycling.service.js's
// reviewRecyclingSubmission does, so the points award commits/rolls back
// atomically with the submission's status update instead of as a separate
// write after).
export async function createPointsEventForRecyclingApproval({ userId, recyclingSubmissionId, points, approvedAt = new Date(), client }) {
  const existing = await findPointsEventByRecyclingSubmission(recyclingSubmissionId, "RECYCLING_APPROVED", client);
  if (existing) {
    return existing;
  }

  const event = await createWithGeneratedId("pointsEvent", "PEV", (id) =>
    createPointsEvent({
      id,
      userId,
      recyclingSubmissionId,
      points,
      eventType: "RECYCLING_APPROVED",
      status: config.pointsLedgerUrl ? "PENDING" : "SENT",
      approvedAt
    }, client)
  );
  return dispatchPointsEvent(event);
}

// `client` lets this run inside a caller's `$transaction` (reward.service.js's
// redeemReward does, so the deduction commits/rolls back atomically with the
// stock decrement and redemption row instead of as a separate write after).
export async function createPointsEventForRewardRedemption({ userId, redemptionId, points, approvedAt = new Date(), client }) {
  const existing = await findPointsEventByRedemption(redemptionId, "REWARD_REDEEMED", client);
  if (existing) {
    return existing;
  }

  const event = await createWithGeneratedId("pointsEvent", "PEV", (id) =>
    createPointsEvent({
      id,
      userId,
      redemptionId,
      points,
      eventType: "REWARD_REDEEMED",
      status: config.pointsLedgerUrl ? "PENDING" : "SENT",
      approvedAt
    }, client)
  );
  return dispatchPointsEvent(event);
}

export async function createPointsEventForRewardRefund({ userId, redemptionId, points, approvedAt = new Date(), client }) {
  const existing = await findPointsEventByRedemptionRefund(redemptionId, client);
  if (existing) {
    return existing;
  }

  const event = await createWithGeneratedId("pointsEvent", "PEV", (id) =>
    createPointsEvent({
      id,
      userId,
      redemptionId,
      points,
      eventType: "REWARD_REFUNDED",
      status: config.pointsLedgerUrl ? "PENDING" : "SENT",
      approvedAt
    }, client)
  );
  return dispatchPointsEvent(event);
}

export async function createAdminAdjustment({ userId, points, approvedAt = new Date() }) {
  const event = await createWithGeneratedId("pointsEvent", "PEV", (id) =>
    createPointsEvent({
      id,
      userId,
      points,
      eventType: "ADMIN_ADJUSTMENT",
      status: config.pointsLedgerUrl ? "PENDING" : "SENT",
      approvedAt
    })
  );
  return dispatchPointsEvent(event);
}

export async function listMyPoints(userId) {
  const [events, total, lifetimeTotal] = await Promise.all([
    findPointsEventsByUser(userId),
    sumPointsForUser(userId),
    sumLifetimePointsForUser(userId)
  ]);

  return { events, total, lifetimeTotal };
}

export function listAllPoints(query = {}) {
  const filters = {};
  if (query.status) filters.status = query.status;
  if (query.userId) filters.userId = query.userId;
  if (query.missionId) filters.missionId = query.missionId;
  if (query.eventType) filters.eventType = query.eventType;

  return findAllPointsEvents(filters);
}

