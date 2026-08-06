import { updateMyProfile, UserServiceError } from "../services/user.service.js";

function handleError(error, response) {
  if (error instanceof UserServiceError) {
    return response.status(error.statusCode).json({ error: { message: error.message } });
  }
  console.error(error);
  return response.status(500).json({ error: { message: "Internal server error" } });
}

export async function updateMeHandler(request, response) {
  try {
    const user = await updateMyProfile(request.user.id, request.body);
    return response.json({ data: { user } });
  } catch (error) {
    return handleError(error, response);
  }
}
