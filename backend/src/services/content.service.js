import { randomUUID } from "node:crypto";
import { createContentSchema, updateContentSchema } from "../validators/content.validator.js";
import {
  createContent as createContentRecord,
  findContentById,
  findContentBySlug,
  findContentByTag,
  updateContent as updateContentRecord
} from "../repositories/content.repository.js";
import { slugify } from "../utils/slugify.js";

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

  return createContentRecord({
    id: randomUUID(),
    slug,
    title: data.title,
    body: data.body,
    tags: data.tags,
    status: data.status,
    createdById
  });
}

export async function getContentById(id) {
  const content = await findContentById(id);
  if (!content) {
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

export async function searchContentByTag(tag) {
  if (!tag) {
    throw new ContentServiceError(400, "Missing or invalid parameters.");
  }

  return findContentByTag(tag);
}
