import { PrismaClient } from "@prisma/client";
import { createWithGeneratedId } from "../utils/idGenerator.js";

const prisma = new PrismaClient();

export function findProgress(userId, contentId) {
  return prisma.learningProgress.findUnique({
    where: { userId_contentId: { userId, contentId } }
  });
}

export function upsertProgress(userId, contentId, updateData, createExtra = {}) {
  return createWithGeneratedId("learningProgress", "PRG", (id) =>
    prisma.learningProgress.upsert({
      where: { userId_contentId: { userId, contentId } },
      create: { id, userId, contentId, ...createExtra },
      update: updateData
    })
  );
}

export function findProgressByUser(userId) {
  return prisma.learningProgress.findMany({
    where: { userId },
    orderBy: { lastActivityAt: "desc" }
  });
}

export function findProgressByContent(contentId) {
  return prisma.learningProgress.findMany({
    where: { contentId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { lastActivityAt: "desc" }
  });
}
