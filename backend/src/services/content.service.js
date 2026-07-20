import { createContentSchema, updateContentSchema } from "../validators/content.validator.js";
import {
  createContent as createContentRecord,
  findContentById,
  findContentBySlug,
  findContent,
  findRevisionsByContentId,
  updateContent as updateContentRecord
} from "../repositories/content.repository.js";
import { slugify } from "../utils/slugify.js";
import { createWithGeneratedId } from "../utils/idGenerator.js";

export class ContentServiceError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

export async function createContent(payload, createdById) {
  const result = createContentSchema.safeParse(payload);
  if (!result.success) {
    throw new ContentServiceError(400, "Missing or invalid parameters.");
  }

  const data = result.data;
  const slug = slugify(data.title);

  const existing = await findContentBySlug(slug);
  if (existing) {
    throw new ContentServiceError(409, "Content with this title already exists.");
  }

  return createWithGeneratedId("content", "CNT", (id) =>
    createContentRecord({
      id,
      slug,
      title: data.title,
      body: data.body,
      tags: data.tags,
      status: data.status,
      createdById
    })
  );
}

export async function getContentById(id, user) {
  const content = await findContentById(id);
  if (!content) {
    throw new ContentServiceError(404, "Content not found.");
  }

  if (user?.role !== "ADMIN" && content.status !== "PUBLISHED") {
    throw new ContentServiceError(404, "Content not found.");
  }

  return content;
}

export async function updateContent(id, payload) {
  const result = updateContentSchema.safeParse(payload);
  if (!result.success) {
    throw new ContentServiceError(400, "Missing or invalid parameters.");
  }

  const existing = await findContentById(id);
  if (!existing) {
    throw new ContentServiceError(404, "Content not found.");
  }

  const data = result.data;
  const updateData = { ...data };
  if (data.title) {
    const slug = slugify(data.title);
    const conflicting = await findContentBySlug(slug);
    if (conflicting && conflicting.id !== id) {
      throw new ContentServiceError(409, "Content with this title already exists.");
    }
    updateData.slug = slug;
  }

  return updateContentRecord(id, updateData);
}

export function listContent(query = {}, user) {
  const filters = {};
  if (query.tag) filters.tags = { has: query.tag };

  if (user?.role !== "ADMIN") {
    filters.status = "PUBLISHED";
  } else if (query.status) {
    filters.status = query.status;
  }

  return findContent(filters);
}

export async function getContentRevisions(contentId) {
  const content = await findContentById(contentId);
  if (!content) {
    throw new ContentServiceError(404, "Content not found.");
  }

  return findRevisionsByContentId(contentId);
}

export async function archiveContent(id) {
  const existing = await findContentById(id);
  if (!existing) {
    throw new ContentServiceError(404, "Content not found.");
  }

  return updateContentRecord(id, { status: "ARCHIVED" });
}
