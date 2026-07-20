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
import { createWithGeneratedId } from "../utils/idGenerator.js";

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

  return createWithGeneratedId("missionSubmission", "SUB", (id) =>
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

  return findAllSubmissions(filters);
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

  return updateSubmission(submissionId, {
    status,
    reviewNote,
    reviewedById: reviewerId,
    reviewedAt: new Date()
  });
}
