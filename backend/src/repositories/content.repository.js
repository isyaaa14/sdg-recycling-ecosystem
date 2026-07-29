import { PrismaClient } from "@prisma/client";
import { createWithGeneratedId } from "../utils/idGenerator.js";

const prisma = new PrismaClient();

export function createContent(data) {
  return prisma.content.create({ data });
}

export function findContentById(id) {
  return prisma.content.findUnique({ where: { id } });
}

export function findContentBySlug(slug) {
  return prisma.content.findUnique({ where: { slug } });
}

export function findContentByTag(tag) {
  return prisma.content.findMany({
    where: { tags: { has: tag } },
    orderBy: { createdAt: "desc" }
  });
}

export function findContent(filters) {
  return prisma.content.findMany({
    where: filters,
    orderBy: { createdAt: "desc" }
  });
}

export function findRevisionsByContentId(contentId) {
  return prisma.contentRevision.findMany({
    where: { contentId },
    orderBy: { version: "desc" }
  });
}

export async function updateContent(id, data) {
  const existing = await prisma.content.findUnique({ where: { id } });
  if (!existing) {
    return null;
  }

  return createWithGeneratedId("contentRevision", "CRV", async (revisionId) => {
    const [, updated] = await prisma.$transaction([
      prisma.contentRevision.create({
        data: {
          id: revisionId,
          contentId: existing.id,
          version: existing.version,
          title: existing.title,
          body: existing.body,
          summary: existing.summary,
          imageUrl: existing.imageUrl,
          estimatedReadMinutes: existing.estimatedReadMinutes,
          contentBlocks: existing.contentBlocks,
          tags: existing.tags,
          status: existing.status
        }
      }),
      prisma.content.update({
        where: { id },
        data: { ...data, version: existing.version + 1 }
      })
    ]);

    return updated;
  });
}
