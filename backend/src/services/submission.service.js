import { submitMissionSchema } from "../validators/mission.validator.js";
import { reviewSubmissionSchema } from "../validators/submission.validator.js";
import { MissionServiceError } from "./mission.service.js";
import { findMissionById } from "../repositories/mission.repository.js";
import {
  createSubmission,
  countUserSubmissionsForMission,
  findActiveUserSubmissionForMission,
  findUserSubmissionForMissionByStatuses,
  findSubmissionsByMission,
  findAllSubmissions,
  findSubmissionById,
  getApprovedMissionProgressForUser,
  updateSubmission,
  updateSubmissionIfPending,
  runInTransaction
} from "../repositories/submission.repository.js";
import { findUploadedFileById, attachUploadToSubmission } from "../repositories/upload.repository.js";
import { createWithGeneratedId } from "../utils/idGenerator.js";
import { createPointsEventForMissionCompletion } from "./points.service.js";
import { evaluateAndIssueBadges } from "./badge.service.js";
import { createMissionProofReadUrl } from "./upload.service.js";

function isMissionCompletedByProgress(mission, progress) {
  switch (mission.type) {
    case "QUANTITY_BASED":
      return mission.targetQuantity == null
        ? progress.approvedCount > 0
        : progress.approvedQuantity >= mission.targetQuantity;
    case "STREAK_BASED":
      return mission.targetDays == null
        ? progress.approvedCount > 0
        : progress.approvedCount >= mission.targetDays;
    case "TIME_LIMITED":
      return progress.approvedCount > 0;
    default:
      return false;
  }
}

// `client` lets this run inside the caller's `$transaction` so the points
// award commits/rolls back atomically with the submission's status update -
// deliberately NOT try/caught here: a failure must abort the whole
// transaction instead of leaving the submission permanently APPROVED with no
// matching points ever awarded (mirrors recycling.service.js's
// reviewRecyclingSubmission).
async function applyApprovalSideEffects({ userId, mission, submissionId, client }) {
  const progress = await getApprovedMissionProgressForUser(mission.id, userId, client);
  if (isMissionCompletedByProgress(mission, progress)) {
    await createPointsEventForMissionCompletion({
      userId,
      missionId: mission.id,
      submissionId,
      points: mission.points,
      client
    });
  }
}

// Badges are evaluated after the approval transaction has committed, and
// failures here are non-fatal (logged only) - unlike points, a badge is not
// the primary reward, so it's not worth failing an otherwise-successful
// approval over (mirrors recycling.service.js's reviewRecyclingSubmission).
async function evaluateBadgesSafely(userId) {
  try {
    await evaluateAndIssueBadges(userId);
  } catch (error) {
    console.error(error);
  }
}

function assertMissionAcceptsStudentAction(mission) {
  if (!mission.isActive || mission.status !== "ACTIVE") {
    throw new MissionServiceError(400, "This mission is not currently accepting submissions.");
  }

  const now = new Date();
  if (now < mission.startAt || now > mission.endAt) {
    throw new MissionServiceError(400, "This mission is outside its submission window.");
  }

  return now;
}

function proofUploadForSubmission(submission) {
  return submission.uploads?.find((upload) => upload.purpose === "MISSION_PROOF");
}

function withMissionProofReadUrl(submission) {
  if (!submission) {
    return submission;
  }

  const { uploads, ...submissionData } = submission;
  const proofUpload = proofUploadForSubmission(submission);
  return {
    ...submissionData,
    proofImageUrl: proofUpload ? createMissionProofReadUrl(proofUpload) : submission.proofImageUrl
  };
}

function withMissionProofReadUrls(submissions) {
  return submissions.map((submission) => withMissionProofReadUrl(submission));
}

export async function joinMission(missionId, userId) {
  const mission = await findMissionById(missionId);
  if (!mission) {
    throw new MissionServiceError(404, "Mission not found.");
  }

  assertMissionAcceptsStudentAction(mission);

  const existingSubmission = await findUserSubmissionForMissionByStatuses(mission.id, userId, [
    "ONGOING",
    "PENDING_REVIEW"
  ]);
  if (existingSubmission) {
    throw new MissionServiceError(409, "You have already joined or submitted this mission.");
  }

  if (mission.submissionCap) {
    const existingCount = await countUserSubmissionsForMission(mission.id, userId);
    if (existingCount >= mission.submissionCap) {
      throw new MissionServiceError(409, "You have reached the submission limit for this mission.");
    }
  }

  return createWithGeneratedId("missionSubmission", "SUB", (id) =>
    createSubmission({
      id,
      missionId: mission.id,
      userId,
      status: "ONGOING"
    })
  );
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

  const now = assertMissionAcceptsStudentAction(mission);
  const existingSubmission = await findUserSubmissionForMissionByStatuses(mission.id, userId, ["ONGOING"]);
  const pendingSubmission = await findUserSubmissionForMissionByStatuses(mission.id, userId, ["PENDING_REVIEW"]);
  if (!existingSubmission && pendingSubmission) {
    throw new MissionServiceError(409, "This mission is already pending review.");
  }
  if (existingSubmission && existingSubmission.status !== "ONGOING") {
    throw new MissionServiceError(409, "This mission has already been submitted.");
  }

  if (!existingSubmission && mission.submissionCap) {
    const existingCount = await countUserSubmissionsForMission(mission.id, userId);
    if (existingCount >= mission.submissionCap) {
      throw new MissionServiceError(409, "You have reached the submission limit for this mission.");
    }
  }

  const data = result.data;
  const autoApproved = mission.autoApprove;
  const submissionData = {
    proofText: data.proofText,
    proofImageUrl: data.proofImageUrl,
    quantity: data.quantity,
    status: autoApproved ? "APPROVED" : "PENDING_REVIEW",
    reviewedAt: autoApproved ? now : null
  };

  if (data.uploadId) {
    const upload = await findUploadedFileById(data.uploadId);
    if (!upload || upload.userId !== userId) {
      throw new MissionServiceError(400, "Invalid upload reference.");
    }
  }

  // The write and the auto-approval points award run inside one transaction
  // so they commit or roll back together (mirrors reviewSubmission below) -
  // otherwise a failure creating the PointsEvent would leave the submission
  // permanently APPROVED with no matching points ever awarded.
  const submission = await runInTransaction(async (tx) => {
    const created = existingSubmission
      ? await updateSubmission(existingSubmission.id, submissionData, tx)
      : await createWithGeneratedId("missionSubmission", "SUB", (id) =>
          createSubmission(
            {
              id,
              missionId: mission.id,
              userId,
              ...submissionData
            },
            tx
          )
        );

    if (autoApproved) {
      await applyApprovalSideEffects({
        userId,
        mission,
        submissionId: created.id,
        client: tx
      });
    }

    return created;
  });

  let responseSubmission = submission;
  if (data.uploadId) {
    await attachUploadToSubmission(data.uploadId, submission.id);
    responseSubmission = await findSubmissionById(submission.id);
  }

  if (autoApproved) {
    await evaluateBadgesSafely(userId);
  }

  return withMissionProofReadUrl(responseSubmission);
}

export async function listMissionSubmissions(missionId) {
  const mission = await findMissionById(missionId);
  if (!mission) {
    throw new MissionServiceError(404, "Mission not found.");
  }

  const submissions = await findSubmissionsByMission(missionId);
  return withMissionProofReadUrls(submissions);
}

export async function listSubmissions(query = {}) {
  const filters = {};
  if (query.status) filters.status = query.status;
  if (query.missionId) filters.missionId = query.missionId;
  if (query.userId) filters.userId = query.userId;

  const submissions = await findAllSubmissions(filters);
  return withMissionProofReadUrls(submissions);
}

export async function listMySubmissions(userId, query = {}) {
  const filters = { userId };
  if (query.status) filters.status = query.status;
  if (query.missionId) filters.missionId = query.missionId;

  const submissions = await findAllSubmissions(filters);
  return withMissionProofReadUrls(submissions);
}

export async function getSubmissionById(id, requestingUser) {
  const submission = await findSubmissionById(id);
  if (!submission) {
    throw new MissionServiceError(404, "Submission not found.");
  }

  if (requestingUser.role !== "ADMIN" && submission.userId !== requestingUser.id) {
    throw new MissionServiceError(403, "You do not have permission to view this submission.");
  }

  return withMissionProofReadUrl(submission);
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
  const reviewedAt = new Date();

  // Atomic guard (mirrors recycling.service.js's reviewRecyclingSubmission):
  // the `status: "PENDING_REVIEW"` condition in `where` makes this update a
  // no-op for a submission a concurrent/duplicate review request already
  // flipped, instead of the findUnique-then-update race above that let two
  // reviews both pass the earlier status check.
  //
  // The status update and the points award run inside one transaction so
  // they commit or roll back together - otherwise a failure creating the
  // PointsEvent would leave the submission permanently APPROVED with no
  // matching points ever awarded.
  await runInTransaction(async (tx) => {
    const reviewResult = await updateSubmissionIfPending(submissionId, {
      status,
      reviewNote,
      reviewedById: reviewerId,
      reviewedAt
    }, tx);

    if (reviewResult.count !== 1) {
      throw new MissionServiceError(409, "This submission has already been reviewed.");
    }

    if (status === "APPROVED") {
      const mission = await findMissionById(submission.missionId);
      await applyApprovalSideEffects({
        userId: submission.userId,
        mission,
        submissionId: submission.id,
        client: tx
      });
    }
  });

  if (status === "APPROVED") {
    await evaluateBadgesSafely(submission.userId);
  }

  return getSubmissionById(submissionId, { id: reviewerId, role: "ADMIN" });
}
