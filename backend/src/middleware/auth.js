import { verifyToken } from "../utils/jwt.js";
import { findUserById } from "../repositories/user.repository.js";

export async function authenticate(request, response, next) {
  const header = request.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return response.status(401).json({ error: { message: "Missing or invalid Authorization header." } });
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return response.status(401).json({ error: { message: "Invalid or expired token." } });
  }

  const user = await findUserById(payload.sub);
  if (!user) {
    return response.status(401).json({ error: { message: "User no longer exists." } });
  }

  if (!user.isActive) {
    return response.status(403).json({ error: { message: "This account has been deactivated. Please contact an administrator." } });
  }

  request.user = user;
  next();
}

export function requireRole(...roles) {
  return (request, response, next) => {
    if (!request.user || !roles.includes(request.user.role)) {
      return response.status(403).json({ error: { message: "You do not have permission to perform this action." } });
    }
    next();
  };
}
