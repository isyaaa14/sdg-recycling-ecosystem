import { register, login, AuthServiceError, sanitizeUser } from "../services/auth.service.js";

export async function registerHandler(request, response) {
  try {
    const result = await register(request.body);
    return response.status(201).json({ data: result });
  } catch (error) {
    if (error instanceof AuthServiceError) {
      return response.status(error.statusCode).json({ error: { message: error.message } });
    }
    console.error(error);
    return response.status(500).json({ error: { message: "Internal server error" } });
  }
}

export async function loginHandler(request, response) {
  try {
    const result = await login(request.body);
    return response.json({ data: result });
  } catch (error) {
    if (error instanceof AuthServiceError) {
      return response.status(error.statusCode).json({ error: { message: error.message } });
    }
    console.error(error);
    return response.status(500).json({ error: { message: "Internal server error" } });
  }
}

export function meHandler(request, response) {
  response.json({ data: { user: sanitizeUser(request.user) } });
}
