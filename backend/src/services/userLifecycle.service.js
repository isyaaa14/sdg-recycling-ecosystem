import { sanitizeUser } from "./auth.service.js";
import {
  deactivateUser,
  findUnreadAdminNotifications,
  findUserById,
  markAdminNotificationsRead,
  reactivateUser
} from "../repositories/userLifecycle.repository.js";

const DEFAULT_DEACTIVATION_REASON = "Deactivated by an administrator upon user request.";

export class UserLifecycleServiceError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
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

export async function deactivateStudent(userId, reason) {
  const user = await findUserById(userId);
  if (!user) {
    throw new UserLifecycleServiceError(404, "User not found.");
  }

  if (user.role !== "STUDENT") {
    throw new UserLifecycleServiceError(400, "Only student accounts can be deactivated through this endpoint.");
  }

  if (!user.isActive) {
    throw new UserLifecycleServiceError(400, "This account is already deactivated.");
  }

  const normalizedReason = reason === undefined ? DEFAULT_DEACTIVATION_REASON : String(reason).trim();
  if (normalizedReason.length < 3 || normalizedReason.length > 500) {
    throw new UserLifecycleServiceError(400, "Deactivation reason must be between 3 and 500 characters.");
  }

  const deactivated = await deactivateUser(userId, normalizedReason);
  return sanitizeUser(deactivated);
}
