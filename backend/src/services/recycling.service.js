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
import {
  claimRecyclingQrCodeIfIssued,
  createRecyclingQrCode,
  createRecyclingSubmission as createRecyclingSubmissionRecord,
  expireIssuedQrCodes as expireIssuedQrCodesRepo,
  findRecyclingQrCodeById,
  findRecyclingQrCodes,
  findRecyclingSubmissionById,
  findRecyclingSubmissions,
  listPointRates as listPointRatesRepo,
  runInTransaction,
  touchUserLastRecyclingSubmission,
  updateRecyclingQrCode,
  updateRecyclingSubmissionIfPending,
  updateUploadedFile,
  upsertPointRate
} from "../repositories/recycling.repository.js";

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

function includeQrRelations() {
  return {
    issuedBy: { select: { id: true, name: true, email: true } },
    claimedBy: { select: { id: true, name: true, email: true } },
    invalidatedBy: { select: { id: true, name: true, email: true } },
    submissions: { select: { id: true, status: true, pointsAwarded: true } }
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
  await expireIssuedQrCodesRepo();
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

  return runInTransaction(async (tx) => {
    const submission = await createWithGeneratedId("recyclingSubmission", "RCS", (id) =>
      createRecyclingSubmissionRecord(
        {
          id,
          userId,
          source: "MANUAL",
          materialType: data.materialType,
          quantity: data.quantity,
          proofImageUrl: upload?.fileUrl ?? data.proofImageUrl,
          status: "PENDING_REVIEW"
        },
        includeSubmissionRelations(),
        tx
      )
    );

    if (upload) {
      await updateUploadedFile(upload.id, { recyclingSubmissionId: submission.id }, tx);
    }

    await touchUserLastRecyclingSubmission(userId, submission.submittedAt, tx);

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

  const submissions = await findRecyclingSubmissions(where, includeSubmissionRelations());
  return withRecyclingProofReadUrls(submissions);
}

export async function listRecyclingSubmissions(query = {}) {
  const where = {};
  if (query.status) where.status = query.status;
  if (query.userId) where.userId = query.userId;
  if (query.materialType) where.materialType = query.materialType;
  const source = parseSubmissionSource(query.source);
  if (source) where.source = source;

  const submissions = await findRecyclingSubmissions(where, includeSubmissionRelations());
  return withRecyclingProofReadUrls(submissions);
}

export async function getRecyclingSubmission(id, requestingUser) {
  const submissionId = parseSubmissionId(id);
  const submission = await findRecyclingSubmissionById(submissionId, includeSubmissionRelations());

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

  const existing = await findRecyclingSubmissionById(submissionId);
  if (!existing) {
    throw new RecyclingServiceError(404, "Recycling submission not found.");
  }

  if (existing.status !== "PENDING_REVIEW") {
    throw new RecyclingServiceError(409, "This recycling submission has already been reviewed.");
  }

  const reviewedAt = new Date();
  const { status, reviewNote } = result.data;
  const pointsAwarded = status === "APPROVED" ? await calculateApprovedPoints(existing, reviewedAt) : 0;

  // Atomic guard (mirrors claimRecyclingQr below): the `status:
  // "PENDING_REVIEW"` condition in `where` makes this update a no-op for a
  // submission that a concurrent/duplicate review request already flipped,
  // instead of the findUnique-then-update race that let two reviews both
  // pass the earlier status check.
  //
  // The status update and the points award run inside one transaction so
  // they commit or roll back together — otherwise a failure creating the
  // PointsEvent would leave the submission permanently APPROVED with no
  // matching points ever awarded.
  await runInTransaction(async (tx) => {
    const reviewResult = await updateRecyclingSubmissionIfPending(submissionId, {
      status,
      pointsAwarded,
      reviewNote,
      reviewedById: reviewerId,
      reviewedAt
    }, tx);

    if (reviewResult.count !== 1) {
      throw new RecyclingServiceError(409, "This recycling submission has already been reviewed.");
    }

    if (status === "APPROVED") {
      await createPointsEventForRecyclingApproval({
        userId: existing.userId,
        recyclingSubmissionId: submissionId,
        points: pointsAwarded,
        approvedAt: reviewedAt,
        client: tx
      });
    }
  });

  if (status === "APPROVED") {
    try {
      await evaluateAndIssueBadges(existing.userId);
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

    return createRecyclingQrCode(
      {
        id,
        nonce,
        signature,
        expiresAt,
        issuedById: adminId,
        materialType: data.materialType,
        estimatedWeightKg: data.estimatedWeightKg,
        payload: qrPayload
      },
      includeQrRelations()
    );
  });

  return formatRecyclingQr(qr);
}

export async function listRecyclingQrCodes(query = {}) {
  await expireIssuedQrCodes();

  const where = {};
  if (query.status) where.status = String(query.status).trim().toUpperCase();
  if (query.materialType) where.materialType = query.materialType;

  const qrCodes = await findRecyclingQrCodes(where, includeQrRelations());
  return qrCodes.map(formatRecyclingQr);
}

export async function getRecyclingQr(id) {
  const qrId = parseQrId(id);
  await expireIssuedQrCodes();

  const qr = await findRecyclingQrCodeById(qrId, includeQrRelations());

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

  const qr = await findRecyclingQrCodeById(data.payload.qrId);

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
    await updateRecyclingQrCode(qr.id, { status: "EXPIRED" });
    throw new RecyclingServiceError(410, "QR expired.");
  }

  try {
    await validateRecyclingSubmission(userId, data.payload.materialType, data.payload.estimatedWeightKg);
  } catch (error) {
    throw normalizeServiceError(error);
  }

  const { submission } = await runInTransaction(async (tx) => {
    const claimResult = await claimRecyclingQrCodeIfIssued(
      qr.id,
      { status: "CLAIMED", claimedById: userId, claimedAt: new Date() },
      tx
    );

    if (claimResult.count !== 1) {
      throw new RecyclingServiceError(409, "QR already used or invalid.");
    }

    const recyclingSubmission = await createWithGeneratedId("recyclingSubmission", "RCS", (id) =>
      createRecyclingSubmissionRecord(
        {
          id,
          userId,
          source: "QR",
          qrCodeId: qr.id,
          materialType: data.payload.materialType,
          quantity: data.payload.estimatedWeightKg,
          status: "PENDING_REVIEW"
        },
        includeSubmissionRelations(),
        tx
      )
    );

    await touchUserLastRecyclingSubmission(userId, recyclingSubmission.submittedAt, tx);

    return { submission: recyclingSubmission };
  });

  return withRecyclingProofReadUrl(submission);
}

export async function invalidateRecyclingQr(id, adminId) {
  const qrId = parseQrId(id);
  await expireIssuedQrCodes();

  const existing = await findRecyclingQrCodeById(qrId);
  if (!existing) {
    throw new RecyclingServiceError(404, "Recycling QR not found.");
  }
  if (existing.status !== "ISSUED") {
    throw new RecyclingServiceError(409, `Only issued QR can be invalidated. Current status: ${existing.status}.`);
  }

  const qr = await updateRecyclingQrCode(
    qrId,
    { status: "INVALIDATED", invalidatedById: adminId, invalidatedAt: new Date() },
    includeQrRelations()
  );

  return formatRecyclingQr(qr);
}

export function listPointRates() {
  return listPointRatesRepo();
}

export async function updatePointRates(payload) {
  const result = updatePointRatesSchema.safeParse(payload);
  if (!result.success) {
    throw new RecyclingServiceError(400, "Missing or invalid parameters.");
  }

  const rates = result.data.rates;
  await runInTransaction(rates.map((rate) => upsertPointRate(rate.material, rate.ratePerKg)));

  return listPointRates();
}
