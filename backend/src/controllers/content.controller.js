import {
  createContent,
  getContentById,
  updateContent,
  listContent,
  getContentRevisions,
  archiveContent,
  ContentServiceError
} from "../services/content.service.js";

function handleError(error, response) {
  if (error instanceof ContentServiceError) {
    return response.status(error.statusCode).json({ error: { message: error.message } });
  }
  console.error(error);
  return response.status(500).json({ error: { message: "Internal server error" } });
}

export async function createContentHandler(request, response) {
  try {
    const content = await createContent(request.body, request.user.id);
    return response.status(201).json({ data: { content } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function getContentHandler(request, response) {
  try {
    const content = await getContentById(request.params.id, request.user);
    return response.status(200).json({ data: { content } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function updateContentHandler(request, response) {
  try {
    const content = await updateContent(request.params.id, request.body);
    return response.status(200).json({ data: { content } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function listContentHandler(request, response) {
  try {
    const content = await listContent(request.query, request.user);
    return response.status(200).json({ data: { content } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function getContentRevisionsHandler(request, response) {
  try {
    const revisions = await getContentRevisions(request.params.id);
    return response.status(200).json({ data: { revisions } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function archiveContentHandler(request, response) {
  try {
    const content = await archiveContent(request.params.id);
    return response.status(200).json({ data: { content } });
  } catch (error) {
    return handleError(error, response);
  }
}
