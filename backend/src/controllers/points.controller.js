import { listMyPoints, listAllPoints, PointsServiceError } from "../services/points.service.js";

function handleError(error, response) {
  if (error instanceof PointsServiceError) {
    return response.status(error.statusCode).json({ error: { message: error.message } });
  }
  console.error(error);
  return response.status(500).json({ error: { message: "Internal server error" } });
}

export async function getMyPointsHandler(request, response) {
  try {
    const points = await listMyPoints(request.user.id);
    return response.status(200).json({ data: points });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function listPointsHandler(request, response) {
  try {
    const events = await listAllPoints(request.query);
    return response.status(200).json({ data: { events } });
  } catch (error) {
    return handleError(error, response);
  }
}
