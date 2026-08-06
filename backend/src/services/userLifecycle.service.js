import { createWithGeneratedId } from "../utils/idGenerator.js";
import { sanitizeUser } from "./auth.service.js";
import {
  createAdminNotification,
  deactivateUser,
  findInactiveStudentCandidates,
  findUnreadAdminNotifications,
  findUserById,
  markAdminNotificationsRead,
  reactivateUser,
  runInTransaction
} from "../repositories/userLifecycle.repository.js";

export const INACTIVITY_THRESHOLD_DAYS = 3;
const DEACTIVATION_REASON = "Auto-deactivated: no recycling submission in 3+ days";

export class UserLifecycleServiceError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

export async function sweepInactiveStudents() {
  const cutoffDate = new Date(Date.now() - INACTIVITY_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);
  const candidates = await findInactiveStudentCandidates(cutoffDate);

  const deactivatedUserIds = [];
  for (const candidate of candidates) {
    await runInTransaction(async (tx) => {
      await deactivateUser(candidate.id, DEACTIVATION_REASON, tx);
      await createWithGeneratedId("adminNotification", "NOT", (id) =>
        createAdminNotification(
          {
            id,
            type: "USER_DEACTIVATED",
            targetUserId: candidate.id,
            message: `${candidate.name} (${candidate.email}) was auto-deactivated after 3 days of recycling inactivity.`
          },
          tx
        )
      );
    });
    deactivatedUserIds.push(candidate.id);
  }

  return { deactivatedCount: deactivatedUserIds.length, deactivatedUserIds };
}

export async function listUnreadAdminNotifications() {
  return findUnreadAdminNotifications();
}

export async function markNotificationsRead(ids, adminId) {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new UserLifecycleServiceError(400, "notificationIds must be a non-empty array.");
  }

  return markAdminNotificationsRead(ids, adminId);
}

export async function reactivateStudent(userId) {
  const user = await findUserById(userId);
  if (!user) {
    throw new UserLifecycleServiceError(404, "User not found.");
  }

  if (user.role !== "STUDENT") {
    throw new UserLifecycleServiceError(400, "Only student accounts can be reactivated through this endpoint.");
  }

  if (user.isActive) {
    throw new UserLifecycleServiceError(400, "This account is already active.");
  }

  const reactivated = await reactivateUser(userId);
  return sanitizeUser(reactivated);
}
