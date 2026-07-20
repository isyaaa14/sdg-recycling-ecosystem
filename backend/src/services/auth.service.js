import bcrypt from "bcrypt";
import { registerSchema, loginSchema } from "../validators/auth.validator.js";
import { createUser, findUserByEmail } from "../repositories/user.repository.js";
import { signToken } from "../utils/jwt.js";
import { createWithGeneratedId } from "../utils/idGenerator.js";

export class AuthServiceError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function sanitizeUser(user) {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

export async function register(payload) {
  const result = registerSchema.safeParse(payload);
  if (!result.success) {
    throw new AuthServiceError(400, "Missing or invalid parameters.");
  }

  const { name, email, password } = result.data;

  const existing = await findUserByEmail(email);
  if (existing) {
    throw new AuthServiceError(409, "An account with this email already exists.");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await createWithGeneratedId("user", "USR", (id) =>
    createUser({
      id,
      name,
      email,
      passwordHash,
      role: "STUDENT"
    })
  );

  const token = signToken({ sub: user.id, role: user.role });
  return { token, user: sanitizeUser(user) };
}

export async function login(payload) {
  const result = loginSchema.safeParse(payload);
  if (!result.success) {
    throw new AuthServiceError(400, "Missing or invalid parameters.");
  }

  const { email, password } = result.data;

  const user = await findUserByEmail(email);
  if (!user) {
    throw new AuthServiceError(401, "Invalid email or password.");
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new AuthServiceError(401, "Invalid email or password.");
  }

  const token = signToken({ sub: user.id, role: user.role });
  return { token, user: sanitizeUser(user) };
}
