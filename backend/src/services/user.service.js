import { updateMyProfileSchema } from "../validators/user.validator.js";
import { updateUser } from "../repositories/user.repository.js";
import { sanitizeUser } from "./auth.service.js";

export class UserServiceError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

export async function updateMyProfile(userId, payload) {
  const result = updateMyProfileSchema.safeParse(payload);
  if (!result.success) {
    throw new UserServiceError(400, "Missing or invalid profile details.");
  }

  const user = await updateUser(userId, {
    name: result.data.name
  });

  return sanitizeUser(user);
}
