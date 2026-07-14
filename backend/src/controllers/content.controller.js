import {
  createContent,
  getContentById,
  updateContent,
  searchContentByTag,
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
    const content = await getContentById(request.params.id);
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

export async function searchContentHandler(request, response) {
  try {
    const content = await searchContentByTag(request.query.tag);
    return response.status(200).json({ data: { content } });
  } catch (error) {
    return handleError(error, response);
  }
}
