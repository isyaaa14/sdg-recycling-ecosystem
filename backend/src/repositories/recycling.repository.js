import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Every function takes an optional `client` (defaulting to this repository's
// own PrismaClient) so a service can pass its `$transaction` callback's `tx`
// through for calls that must commit/roll back atomically together.

export function expireIssuedQrCodes(client = prisma) {
  return client.recyclingQrCode.updateMany({
    where: { status: "ISSUED", expiresAt: { lt: new Date() } },
    data: { status: "EXPIRED" }
  });
}

export function createRecyclingSubmission(data, includeRelations, client = prisma) {
  return client.recyclingSubmission.create({ data, include: includeRelations });
}

export function updateUploadedFile(id, data, client = prisma) {
  return client.uploadedFile.update({ where: { id }, data });
}

export function touchUserLastRecyclingSubmission(userId, submittedAt, client = prisma) {
  return client.user.update({ where: { id: userId }, data: { lastRecyclingSubmissionAt: submittedAt } });
}

export function findRecyclingSubmissions(where, includeRelations, client = prisma) {
  return client.recyclingSubmission.findMany({
    where,
    include: includeRelations,
    orderBy: { submittedAt: "desc" }
  });
}

export function findRecyclingSubmissionById(id, includeRelations, client = prisma) {
  return client.recyclingSubmission.findUnique({
    where: { id },
    include: includeRelations
  });
}

export function updateRecyclingSubmissionIfPending(id, data, client = prisma) {
  return client.recyclingSubmission.updateMany({
    where: { id, status: "PENDING_REVIEW" },
    data
  });
}

export function createRecyclingQrCode(data, includeRelations, client = prisma) {
  return client.recyclingQrCode.create({ data, include: includeRelations });
}

export function findRecyclingQrCodes(where, includeRelations, client = prisma) {
  return client.recyclingQrCode.findMany({
    where,
    include: includeRelations,
    orderBy: { createdAt: "desc" },
    take: 100
  });
}

export function findRecyclingQrCodeById(id, includeRelations, client = prisma) {
  return client.recyclingQrCode.findUnique({ where: { id }, include: includeRelations });
}

export function updateRecyclingQrCode(id, data, includeRelations, client = prisma) {
  return client.recyclingQrCode.update({ where: { id }, data, include: includeRelations });
}

export function claimRecyclingQrCodeIfIssued(id, data, client = prisma) {
  return client.recyclingQrCode.updateMany({
    where: { id, status: "ISSUED" },
    data
  });
}

export function listPointRates(client = prisma) {
  return client.pointRate.findMany({ orderBy: { material: "asc" } });
}

export function upsertPointRate(material, ratePerKg, client = prisma) {
  return client.pointRate.upsert({
    where: { material },
    update: { ratePerKg },
    create: { material, ratePerKg }
  });
}

export function runInTransaction(callback) {
  return prisma.$transaction(callback);
}
