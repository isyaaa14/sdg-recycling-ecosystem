import {
  markContentComplete,
  listMyProgress,
  listProgressForContent,
  getMyProgressForContent,
  ProgressServiceError
} from "../services/progress.service.js";

function handleError(error, response) {
  if (error instanceof ProgressServiceError) {
    return response.status(error.statusCode).json({ error: { message: error.message } });
  }
  console.error(error);
  return response.status(500).json({ error: { message: "Internal server error" } });
}

export async function listMyProgressHandler(request, response) {
  try {
    const progress = await listMyProgress(request.user.id);
    return response.status(200).json({ data: { progress } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function getMyProgressForContentHandler(request, response) {
  try {
    const progress = await getMyProgressForContent(request.user.id, request.params.contentId);
    return response.status(200).json({ data: { progress } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function markCompleteHandler(request, response) {
  try {
    const progress = await markContentComplete(request.user.id, request.params.contentId);
    return response.status(200).json({ data: { progress } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function listContentProgressHandler(request, response) {
  try {
    const progress = await listProgressForContent(request.params.contentId);
    return response.status(200).json({ data: { progress } });
  } catch (error) {
    return handleError(error, response);
  }
}
