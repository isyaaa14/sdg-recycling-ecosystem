import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export function createUploadedFile(data) {
  return prisma.uploadedFile.create({ data });
}

export function findUploadedFileById(id) {
  return prisma.uploadedFile.findUnique({ where: { id } });
}

export function findUploadedFilesByUser(userId) {
  return prisma.uploadedFile.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" }
  });
}

export function attachUploadToSubmission(uploadId, submissionId) {
  return prisma.uploadedFile.update({
    where: { id: uploadId },
    data: { missionSubmissionId: submissionId }
  });
}

export function attachUploadToRecyclingSubmission(uploadId, recyclingSubmissionId) {
  return prisma.uploadedFile.update({
    where: { id: uploadId },
    data: { recyclingSubmissionId }
  });
}
