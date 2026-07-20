import {
  listSubmissions,
  listMySubmissions,
  getSubmissionById,
  reviewSubmission
} from "../services/submission.service.js";
import { MissionServiceError } from "../services/mission.service.js";

function handleError(error, response) {
  if (error instanceof MissionServiceError) {
    return response.status(error.statusCode).json({ error: { message: error.message } });
  }
  console.error(error);
  return response.status(500).json({ error: { message: "Internal server error" } });
}

export async function listSubmissionsHandler(request, response) {
  try {
    const submissions = await listSubmissions(request.query);
    return response.json({ data: { submissions } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function listMySubmissionsHandler(request, response) {
  try {
    const submissions = await listMySubmissions(request.user.id, request.query);
    return response.json({ data: { submissions } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function getSubmissionHandler(request, response) {
  try {
    const submission = await getSubmissionById(request.params.id, request.user);
    return response.json({ data: { submission } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function reviewSubmissionHandler(request, response) {
  try {
    const submission = await reviewSubmission(request.params.id, request.body, request.user.id);
    return response.json({ data: { submission } });
  } catch (error) {
    return handleError(error, response);
  }
}
