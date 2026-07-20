import { submitMissionSchema } from "../validators/mission.validator.js";
import { reviewSubmissionSchema } from "../validators/submission.validator.js";
import { MissionServiceError } from "./mission.service.js";
import { findMissionById } from "../repositories/mission.repository.js";
import {
  createSubmission,
  countUserSubmissionsForMission,
  findSubmissionsByMission,
  findAllSubmissions,
  findSubmissionById,
  updateSubmission
} from "../repositories/submission.repository.js";
import { findUploadedFileById, attachUploadToSubmission } from "../repositories/upload.repository.js";
import { createWithGeneratedId } from "../utils/idGenerator.js";
import { createPointsEventForApproval } from "./points.service.js";
import { evaluateAndIssueBadges } from "./badge.service.js";

async function applyApprovalSideEffects({ userId, missionId, submissionId, points }) {
  try {
    await createPointsEventForApproval({ userId, missionId, submissionId, points });
  } catch (error) {
    console.error(error);
  }

  try {
    await evaluateAndIssueBadges(userId);
  } catch (error) {
    console.error(error);
  }
}

export async function submitMission(missionId, payload, userId) {
  const result = submitMissionSchema.safeParse(payload);
  if (!result.success) {
    throw new MissionServiceError(400, "Missing or invalid parameters.");
  }

  const mission = await findMissionById(missionId);
  if (!mission) {
    throw new MissionServiceError(404, "Mission not found.");
  }

  if (!mission.isActive || mission.status !== "ACTIVE") {
    throw new MissionServiceError(400, "This mission is not currently accepting submissions.");
  }

  const now = new Date();
  if (now < mission.startAt || now > mission.endAt) {
    throw new MissionServiceError(400, "This mission is outside its submission window.");
  }

  if (mission.submissionCap) {
    const existingCount = await countUserSubmissionsForMission(mission.id, userId);
    if (existingCount >= mission.submissionCap) {
      throw new MissionServiceError(409, "You have reached the submission limit for this mission.");
    }
  }

  const data = result.data;
  const autoApproved = mission.autoApprove;

  if (data.uploadId) {
    const upload = await findUploadedFileById(data.uploadId);
    if (!upload || upload.userId !== userId) {
      throw new MissionServiceError(400, "Invalid upload reference.");
    }
  }

  const submission = await createWithGeneratedId("missionSubmission", "SUB", (id) =>
    createSubmission({
      id,
      missionId: mission.id,
      userId,
      proofText: data.proofText,
      proofImageUrl: data.proofImageUrl,
      quantity: data.quantity,
      status: autoApproved ? "APPROVED" : "PENDING_REVIEW",
      reviewedAt: autoApproved ? now : null
    })
  );

  if (data.uploadId) {
    await attachUploadToSubmission(data.uploadId, submission.id);
  }

  if (autoApproved) {
    await applyApprovalSideEffects({
      userId,
      missionId: mission.id,
      submissionId: submission.id,
      points: mission.points
    });
  }

  return submission;
}

export async function listMissionSubmissions(missionId) {
  const mission = await findMissionById(missionId);
  if (!mission) {
    throw new MissionServiceError(404, "Mission not found.");
  }

  return findSubmissionsByMission(missionId);
}

export function listSubmissions(query = {}) {
  const filters = {};
  if (query.status) filters.status = query.status;
  if (query.missionId) filters.missionId = query.missionId;
  if (query.userId) filters.userId = query.userId;

  return findAllSubmissions(filters);
}

export function listMySubmissions(userId, query = {}) {
  const filters = { userId };
  if (query.status) filters.status = query.status;
  if (query.missionId) filters.missionId = query.missionId;

  return findAllSubmissions(filters);
}

export async function getSubmissionById(id, requestingUser) {
  const submission = await findSubmissionById(id);
  if (!submission) {
    throw new MissionServiceError(404, "Submission not found.");
  }

  if (requestingUser.role !== "ADMIN" && submission.userId !== requestingUser.id) {
    throw new MissionServiceError(403, "You do not have permission to view this submission.");
  }

  return submission;
}

export async function reviewSubmission(submissionId, payload, reviewerId) {
  const result = reviewSubmissionSchema.safeParse(payload);
  if (!result.success) {
    throw new MissionServiceError(400, "Missing or invalid parameters.");
  }

  const submission = await findSubmissionById(submissionId);
  if (!submission) {
    throw new MissionServiceError(404, "Submission not found.");
  }

  if (submission.status !== "PENDING_REVIEW") {
    throw new MissionServiceError(409, "This submission has already been reviewed.");
  }

  const { status, reviewNote } = result.data;

  const updated = await updateSubmission(submissionId, {
    status,
    reviewNote,
    reviewedById: reviewerId,
    reviewedAt: new Date()
  });

  if (status === "APPROVED") {
    const mission = await findMissionById(submission.missionId);
    await applyApprovalSideEffects({
      userId: submission.userId,
      missionId: submission.missionId,
      submissionId: submission.id,
      points: mission.points
    });
  }

  return updated;
}
