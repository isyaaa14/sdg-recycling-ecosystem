import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";
import {
  claimRecyclingQrSchema,
  createRecyclingSubmissionSchema,
  issueRecyclingQrSchema,
  recyclingSubmissionSourceSchema,
  reviewRecyclingSubmissionSchema,
  updatePointRatesSchema
} from "../validators/recycling.validator.js";
import {
  AntiGamingServiceError,
  getPointRate,
  logSuspiciousActivity,
  validateRecyclingSubmission
} from "./antiGaming.service.js";
import {
  createPointsEventForRecyclingApproval
} from "./points.service.js";
import { sumDailyRecyclingPointsForUser } from "../repositories/points.repository.js";
import { evaluateAndIssueBadges } from "./badge.service.js";
import { findUploadedFileById } from "../repositories/upload.repository.js";
import { createRecyclingProofReadUrl } from "./upload.service.js";
import { createWithGeneratedId } from "../utils/idGenerator.js";
import { config } from "../utils/config.js";
import { signQrPayload, verifyQrPayload } from "../utils/qrSigner.js";

const prisma = new PrismaClient();
const DAILY_RECYCLING_POINT_CAP = 1000;

export class RecyclingServiceError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function normalizeServiceError(error) {
  if (error instanceof AntiGamingServiceError) {
    return new RecyclingServiceError(error.statusCode, error.message);
  }
  return error;
}

function parseSubmissionId(id) {
  const submissionId = String(id ?? "").trim();
  if (!submissionId) {
    throw new RecyclingServiceError(400, "Invalid recycling submission id.");
  }
  return submissionId;
}

function parseQrId(id) {
  const qrId = String(id ?? "").trim();
  if (!qrId) {
    throw new RecyclingServiceError(400, "Invalid recycling QR id.");
  }
  return qrId;
}

function parseSubmissionSource(source) {
  if (!source) return null;
  const result = recyclingSubmissionSourceSchema.safeParse(String(source).trim().toUpperCase());
  if (!result.success) {
    throw new RecyclingServiceError(400, "Invalid recycling submission source.");
  }
  return result.data;
}

function includeSubmissionRelations() {
  return {
    user: { select: { id: true, name: true, email: true } },
    reviewedBy: { select: { id: true, name: true, email: true } },
    qrCode: {
      select: {
        id: true,
        status: true,
        materialType: true,
        estimatedWeightKg: true,
        expiresAt: true,
        claimedAt: true
      }
    },
    uploads: { orderBy: { createdAt: "desc" } },
    pointsEvents: {
      select: { id: true, points: true, eventType: true, status: true, approvedAt: true },
      orderBy: { createdAt: "desc" }
    }
  };
}

function proofUploadForSubmission(submission) {
  return submission.uploads?.find((upload) => upload.purpose === "RECYCLING_PROOF") ?? null;
}

function withRecyclingProofReadUrl(submission) {
  if (!submission) return submission;
  const proofUpload = proofUploadForSubmission(submission);
  return {
    ...submission,
    proofImageUrl: proofUpload ? createRecyclingProofReadUrl(proofUpload) : submission.proofImageUrl
  };
}

function withRecyclingProofReadUrls(submissions) {
  return submissions.map((submission) => withRecyclingProofReadUrl(submission));
}

function formatRecyclingQr(qr) {
  if (!qr) return qr;
  return {
    ...qr,
    signedPayload: {
      payload: qr.payload,
      signature: qr.signature
    },
    claimPayload: JSON.stringify({
      payload: qr.payload,
      signature: qr.signature
    })
  };
}

async function expireIssuedQrCodes() {
  await prisma.recyclingQrCode.updateMany({
    where: { status: "ISSUED", expiresAt: { lt: new Date() } },
    data: { status: "EXPIRED" }
  });
}

async function logQrSuspiciousActivity(userId, activityType, details) {
  try {
    await logSuspiciousActivity(userId, activityType, "high", JSON.stringify(details), false);
  } catch (error) {
    console.error(error);
  }
}

export async function createRecyclingSubmission(payload, userId) {
  const result = createRecyclingSubmissionSchema.safeParse(payload);
  if (!result.success) {
    throw new RecyclingServiceError(400, "Missing or invalid parameters.");
  }

  const data = result.data;
  try {
    await validateRecyclingSubmission(userId, data.materialType, data.quantity);
  } catch (error) {
    throw normalizeServiceError(error);
  }

  let upload = null;
  if (data.uploadId) {
    upload = await findUploadedFileById(data.uploadId);
    if (!upload || upload.userId !== userId || upload.purpose !== "RECYCLING_PROOF") {
      throw new RecyclingServiceError(400, "Invalid upload reference.");
    }
    if (upload.recyclingSubmissionId) {
      throw new RecyclingServiceError(409, "This upload has already been used for a recycling submission.");
    }
  }

  return prisma.$transaction(async (tx) => {
    const submission = await createWithGeneratedId("recyclingSubmission", "RCS", (id) =>
      tx.recyclingSubmission.create({
        data: {
          id,
          userId,
          source: "MANUAL",
          materialType: data.materialType,
          quantity: data.quantity,
          proofImageUrl: upload?.fileUrl ?? data.proofImageUrl,
          status: "PENDING_REVIEW"
        },
        include: includeSubmissionRelations()
      })
    );

    if (upload) {
      await tx.uploadedFile.update({
        where: { id: upload.id },
        data: { recyclingSubmissionId: submission.id }
      });
    }

    await tx.user.update({
      where: { id: userId },
      data: { lastRecyclingSubmissionAt: submission.submittedAt }
    });

    return withRecyclingProofReadUrl({
      ...submission,
      uploads: upload ? [upload] : submission.uploads
    });
  });
}

export async function listMyRecyclingSubmissions(userId, query = {}) {
  const where = { userId };
  if (query.status) where.status = query.status;
  if (query.materialType) where.materialType = query.materialType;
  const source = parseSubmissionSource(query.source);
  if (source) where.source = source;

  const submissions = await prisma.recyclingSubmission.findMany({
    where,
    include: includeSubmissionRelations(),
    orderBy: { submittedAt: "desc" }
  });
  return withRecyclingProofReadUrls(submissions);
}

export async function listRecyclingSubmissions(query = {}) {
  const where = {};
  if (query.status) where.status = query.status;
  if (query.userId) where.userId = query.userId;
  if (query.materialType) where.materialType = query.materialType;
  const source = parseSubmissionSource(query.source);
  if (source) where.source = source;

  const submissions = await prisma.recyclingSubmission.findMany({
    where,
    include: includeSubmissionRelations(),
    orderBy: { submittedAt: "desc" }
  });
  return withRecyclingProofReadUrls(submissions);
}

export async function getRecyclingSubmission(id, requestingUser) {
  const submissionId = parseSubmissionId(id);
  const submission = await prisma.recyclingSubmission.findUnique({
    where: { id: submissionId },
    include: includeSubmissionRelations()
  });

  if (!submission) {
    throw new RecyclingServiceError(404, "Recycling submission not found.");
  }

  if (requestingUser.role !== "ADMIN" && submission.userId !== requestingUser.id) {
    throw new RecyclingServiceError(403, "You do not have permission to view this submission.");
  }

  return withRecyclingProofReadUrl(submission);
}

async function calculateApprovedPoints(submission, approvedAt) {
  const rate = await getPointRate(submission.materialType);
  if (!rate) {
    throw new RecyclingServiceError(400, "Unsupported recycling material.");
  }

  const rawPoints = Math.floor(submission.quantity * rate.ratePerKg);
  const dailyPoints = await sumDailyRecyclingPointsForUser(submission.userId, approvedAt);
  const remaining = Math.max(0, DAILY_RECYCLING_POINT_CAP - dailyPoints);
  return Math.min(rawPoints, remaining);
}

export async function reviewRecyclingSubmission(id, payload, reviewerId) {
  const submissionId = parseSubmissionId(id);
  const result = reviewRecyclingSubmissionSchema.safeParse(payload);
  if (!result.success) {
    throw new RecyclingServiceError(400, "Missing or invalid parameters.");
  }

  const existing = await prisma.recyclingSubmission.findUnique({ where: { id: submissionId } });
  if (!existing) {
    throw new RecyclingServiceError(404, "Recycling submission not found.");
  }

  if (existing.status !== "PENDING_REVIEW") {
    throw new RecyclingServiceError(409, "This recycling submission has already been reviewed.");
  }

  const reviewedAt = new Date();
  const { status, reviewNote } = result.data;
  const pointsAwarded = status === "APPROVED" ? await calculateApprovedPoints(existing, reviewedAt) : 0;

  const updated = await prisma.recyclingSubmission.update({
    where: { id: submissionId },
    data: {
      status,
      pointsAwarded,
      reviewNote,
      reviewedById: reviewerId,
      reviewedAt
    },
    include: includeSubmissionRelations()
  });

  if (status === "APPROVED") {
    await createPointsEventForRecyclingApproval({
      userId: updated.userId,
      recyclingSubmissionId: updated.id,
      points: pointsAwarded,
      approvedAt: reviewedAt
    });

    try {
      await evaluateAndIssueBadges(updated.userId);
    } catch (error) {
      console.error(error);
    }
  }

  return getRecyclingSubmission(submissionId, { id: reviewerId, role: "ADMIN" });
}

export async function issueRecyclingQr(payload, adminId) {
  const result = issueRecyclingQrSchema.safeParse(payload);
  if (!result.success) {
    throw new RecyclingServiceError(400, "Missing or invalid parameters.");
  }

  const data = result.data;
  const expiresInMinutes = data.expiresInMinutes ?? config.qrDefaultExpiryMinutes;
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
  const nonce = randomBytes(16).toString("hex");

  const qr = await createWithGeneratedId("recyclingQrCode", "QR", async (id) => {
    const qrPayload = {
      qrId: id,
      nonce,
      type: "recycling-deposit",
      materialType: data.materialType,
      estimatedWeightKg: data.estimatedWeightKg,
      expiresAt: expiresAt.toISOString()
    };
    const signature = signQrPayload(qrPayload);

    return prisma.recyclingQrCode.create({
      data: {
        id,
        nonce,
        signature,
        expiresAt,
        issuedById: adminId,
        materialType: data.materialType,
        estimatedWeightKg: data.estimatedWeightKg,
        payload: qrPayload
      },
      include: {
        issuedBy: { select: { id: true, name: true, email: true } },
        claimedBy: { select: { id: true, name: true, email: true } },
        invalidatedBy: { select: { id: true, name: true, email: true } },
        submissions: { select: { id: true, status: true, pointsAwarded: true } }
      }
    });
  });

  return formatRecyclingQr(qr);
}

export async function listRecyclingQrCodes(query = {}) {
  await expireIssuedQrCodes();

  const where = {};
  if (query.status) where.status = String(query.status).trim().toUpperCase();
  if (query.materialType) where.materialType = query.materialType;

  const qrCodes = await prisma.recyclingQrCode.findMany({
    where,
    include: {
      issuedBy: { select: { id: true, name: true, email: true } },
      claimedBy: { select: { id: true, name: true, email: true } },
      invalidatedBy: { select: { id: true, name: true, email: true } },
      submissions: { select: { id: true, status: true, pointsAwarded: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return qrCodes.map(formatRecyclingQr);
}

export async function getRecyclingQr(id) {
  const qrId = parseQrId(id);
  await expireIssuedQrCodes();

  const qr = await prisma.recyclingQrCode.findUnique({
    where: { id: qrId },
    include: {
      issuedBy: { select: { id: true, name: true, email: true } },
      claimedBy: { select: { id: true, name: true, email: true } },
      invalidatedBy: { select: { id: true, name: true, email: true } },
      submissions: { select: { id: true, status: true, pointsAwarded: true } }
    }
  });

  if (!qr) {
    throw new RecyclingServiceError(404, "Recycling QR not found.");
  }

  return formatRecyclingQr(qr);
}

export async function claimRecyclingQr(payload, userId) {
  const result = claimRecyclingQrSchema.safeParse(payload);
  if (!result.success) {
    throw new RecyclingServiceError(400, "Missing or invalid parameters.");
  }

  const data = result.data;
  if (!verifyQrPayload(data.payload, data.signature)) {
    await logQrSuspiciousActivity(userId, "qr_invalid_signature", { payload: data.payload });
    throw new RecyclingServiceError(400, "Invalid QR signature.");
  }

  const qr = await prisma.recyclingQrCode.findUnique({
    where: { id: data.payload.qrId }
  });

  if (!qr) {
    throw new RecyclingServiceError(404, "Recycling QR not found.");
  }

  if (qr.signature !== data.signature) {
    await logQrSuspiciousActivity(userId, "qr_signature_mismatch", { qrId: qr.id });
    throw new RecyclingServiceError(400, "Invalid QR signature.");
  }

  if (qr.nonce !== data.payload.nonce) {
    await logQrSuspiciousActivity(userId, "qr_nonce_mismatch", {
      qrId: qr.id,
      receivedNonce: data.payload.nonce
    });
    throw new RecyclingServiceError(400, "Invalid QR nonce.");
  }

  if (qr.status !== "ISSUED") {
    await logQrSuspiciousActivity(userId, "qr_replay_attempt", {
      qrId: qr.id,
      currentStatus: qr.status
    });
    throw new RecyclingServiceError(409, "QR already used or invalid.");
  }

  if (new Date() > qr.expiresAt) {
    await prisma.recyclingQrCode.update({
      where: { id: qr.id },
      data: { status: "EXPIRED" }
    });
    throw new RecyclingServiceError(410, "QR expired.");
  }

  try {
    await validateRecyclingSubmission(userId, data.payload.materialType, data.payload.estimatedWeightKg);
  } catch (error) {
    throw normalizeServiceError(error);
  }

  const { submission } = await prisma.$transaction(async (tx) => {
    const claimResult = await tx.recyclingQrCode.updateMany({
      where: { id: qr.id, status: "ISSUED" },
      data: {
        status: "CLAIMED",
        claimedById: userId,
        claimedAt: new Date()
      }
    });

    if (claimResult.count !== 1) {
      throw new RecyclingServiceError(409, "QR already used or invalid.");
    }

    const recyclingSubmission = await createWithGeneratedId("recyclingSubmission", "RCS", (id) =>
      tx.recyclingSubmission.create({
        data: {
          id,
          userId,
          source: "QR",
          qrCodeId: qr.id,
          materialType: data.payload.materialType,
          quantity: data.payload.estimatedWeightKg,
          status: "PENDING_REVIEW"
        },
        include: includeSubmissionRelations()
      })
    );

    await tx.user.update({
      where: { id: userId },
      data: { lastRecyclingSubmissionAt: recyclingSubmission.submittedAt }
    });

    return { submission: recyclingSubmission };
  });

  return withRecyclingProofReadUrl(submission);
}

export async function invalidateRecyclingQr(id, adminId) {
  const qrId = parseQrId(id);
  await expireIssuedQrCodes();

  const existing = await prisma.recyclingQrCode.findUnique({ where: { id: qrId } });
  if (!existing) {
    throw new RecyclingServiceError(404, "Recycling QR not found.");
  }
  if (existing.status !== "ISSUED") {
    throw new RecyclingServiceError(409, `Only issued QR can be invalidated. Current status: ${existing.status}.`);
  }

  const qr = await prisma.recyclingQrCode.update({
    where: { id: qrId },
    data: {
      status: "INVALIDATED",
      invalidatedById: adminId,
      invalidatedAt: new Date()
    },
    include: {
      issuedBy: { select: { id: true, name: true, email: true } },
      claimedBy: { select: { id: true, name: true, email: true } },
      invalidatedBy: { select: { id: true, name: true, email: true } },
      submissions: { select: { id: true, status: true, pointsAwarded: true } }
    }
  });

  return formatRecyclingQr(qr);
}

export function listPointRates() {
  return prisma.pointRate.findMany({ orderBy: { material: "asc" } });
}

export async function updatePointRates(payload) {
  const result = updatePointRatesSchema.safeParse(payload);
  if (!result.success) {
    throw new RecyclingServiceError(400, "Missing or invalid parameters.");
  }

  const rates = result.data.rates;
  await prisma.$transaction(
    rates.map((rate) =>
      prisma.pointRate.upsert({
        where: { material: rate.material },
        update: { ratePerKg: rate.ratePerKg },
        create: { material: rate.material, ratePerKg: rate.ratePerKg }
      })
    )
  );

  return listPointRates();
}
