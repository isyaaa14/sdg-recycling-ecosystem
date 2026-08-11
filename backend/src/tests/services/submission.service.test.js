import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";

const fakeTx = { __tx: true };

const mockCreateSubmission = jest.fn();
const mockCountUserSubmissionsForMission = jest.fn();
const mockFindActiveUserSubmissionForMission = jest.fn();
const mockFindUserSubmissionForMissionByStatuses = jest.fn();
const mockFindSubmissionsByMission = jest.fn();
const mockFindAllSubmissions = jest.fn();
const mockFindSubmissionById = jest.fn();
const mockGetApprovedMissionProgressForUser = jest.fn();
const mockUpdateSubmission = jest.fn();
const mockUpdateSubmissionIfPending = jest.fn();
const mockRunInTransaction = jest.fn((callback) => callback(fakeTx));

jest.unstable_mockModule("../../repositories/submission.repository.js", () => ({
  createSubmission: mockCreateSubmission,
  countUserSubmissionsForMission: mockCountUserSubmissionsForMission,
  findActiveUserSubmissionForMission: mockFindActiveUserSubmissionForMission,
  findUserSubmissionForMissionByStatuses: mockFindUserSubmissionForMissionByStatuses,
  findSubmissionsByMission: mockFindSubmissionsByMission,
  findAllSubmissions: mockFindAllSubmissions,
  findSubmissionById: mockFindSubmissionById,
  getApprovedMissionProgressForUser: mockGetApprovedMissionProgressForUser,
  updateSubmission: mockUpdateSubmission,
  updateSubmissionIfPending: mockUpdateSubmissionIfPending,
  runInTransaction: mockRunInTransaction
}));

const mockFindMissionById = jest.fn();
jest.unstable_mockModule("../../repositories/mission.repository.js", () => ({
  findMissionById: mockFindMissionById
}));

class MockMissionServiceError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}
jest.unstable_mockModule("../../services/mission.service.js", () => ({
  MissionServiceError: MockMissionServiceError
}));

const mockCreatePointsEventForMissionCompletion = jest.fn();
jest.unstable_mockModule("../../services/points.service.js", () => ({
  createPointsEventForMissionCompletion: mockCreatePointsEventForMissionCompletion
}));

const mockEvaluateAndIssueBadges = jest.fn();
jest.unstable_mockModule("../../services/badge.service.js", () => ({
  evaluateAndIssueBadges: mockEvaluateAndIssueBadges
}));

const mockFindUploadedFileById = jest.fn();
const mockAttachUploadToSubmission = jest.fn();
jest.unstable_mockModule("../../repositories/upload.repository.js", () => ({
  findUploadedFileById: mockFindUploadedFileById,
  attachUploadToSubmission: mockAttachUploadToSubmission
}));

const mockCreateMissionProofReadUrl = jest.fn();
jest.unstable_mockModule("../../services/upload.service.js", () => ({
  createMissionProofReadUrl: mockCreateMissionProofReadUrl
}));

const mockCreateWithGeneratedId = jest.fn((model, prefix, createFn) => createFn(`${prefix}-TEST`));
jest.unstable_mockModule("../../utils/idGenerator.js", () => ({
  createWithGeneratedId: mockCreateWithGeneratedId
}));

const { reviewSubmission, submitMission, getSubmissionById } = await import("../../services/submission.service.js");

let consoleErrorSpy;

beforeEach(() => {
  jest.clearAllMocks();
  mockRunInTransaction.mockImplementation((callback) => callback(fakeTx));
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("reviewSubmission", () => {
  const pendingSubmission = {
    id: "SUB001",
    missionId: "MIS001",
    userId: "USR001",
    status: "PENDING_REVIEW"
  };
  const quantityMission = {
    id: "MIS001",
    type: "QUANTITY_BASED",
    targetQuantity: 20,
    points: 25
  };

  it("threads the same tx through the status update and the points event creation when the mission completes", async () => {
    mockFindSubmissionById.mockResolvedValue(pendingSubmission);
    mockFindMissionById.mockResolvedValue(quantityMission);
    mockUpdateSubmissionIfPending.mockResolvedValue({ count: 1 });
    mockGetApprovedMissionProgressForUser.mockResolvedValue({ approvedCount: 1, approvedQuantity: 20 });
    mockCreatePointsEventForMissionCompletion.mockResolvedValue({ id: "PEV001" });
    mockEvaluateAndIssueBadges.mockResolvedValue([]);

    await reviewSubmission("SUB001", { status: "APPROVED" }, "ADM001");

    expect(mockUpdateSubmissionIfPending).toHaveBeenCalledWith(
      "SUB001",
      expect.objectContaining({ status: "APPROVED", reviewedById: "ADM001" }),
      fakeTx
    );
    expect(mockGetApprovedMissionProgressForUser).toHaveBeenCalledWith("MIS001", "USR001", fakeTx);
    expect(mockCreatePointsEventForMissionCompletion).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "USR001", missionId: "MIS001", submissionId: "SUB001", client: fakeTx })
    );
  });

  it("does not create a points event when the mission's completion criteria are not yet met", async () => {
    mockFindSubmissionById.mockResolvedValue(pendingSubmission);
    mockFindMissionById.mockResolvedValue(quantityMission);
    mockUpdateSubmissionIfPending.mockResolvedValue({ count: 1 });
    mockGetApprovedMissionProgressForUser.mockResolvedValue({ approvedCount: 1, approvedQuantity: 5 });

    await reviewSubmission("SUB001", { status: "APPROVED" }, "ADM001");

    expect(mockCreatePointsEventForMissionCompletion).not.toHaveBeenCalled();
  });

  it("returns 409 and never creates a points event when the atomic guard reports no row updated", async () => {
    mockFindSubmissionById.mockResolvedValue(pendingSubmission);

    mockUpdateSubmissionIfPending.mockResolvedValue({ count: 0 });

    await expect(reviewSubmission("SUB001", { status: "APPROVED" }, "ADM001")).rejects.toMatchObject({
      statusCode: 409
    });

    expect(mockCreatePointsEventForMissionCompletion).not.toHaveBeenCalled();
  });

  it("rejects immediately (no transaction attempted) when the submission is already reviewed", async () => {
    mockFindSubmissionById.mockResolvedValue({ ...pendingSubmission, status: "APPROVED" });

    await expect(reviewSubmission("SUB001", { status: "APPROVED" }, "ADM001")).rejects.toMatchObject({
      statusCode: 409
    });

    expect(mockRunInTransaction).not.toHaveBeenCalled();
  });

  it("aborts the whole call when creating the points event fails, and never evaluates badges", async () => {
    mockFindSubmissionById.mockResolvedValue(pendingSubmission);
    mockFindMissionById.mockResolvedValue(quantityMission);
    mockUpdateSubmissionIfPending.mockResolvedValue({ count: 1 });
    mockGetApprovedMissionProgressForUser.mockResolvedValue({ approvedCount: 1, approvedQuantity: 20 });
    mockCreatePointsEventForMissionCompletion.mockRejectedValue(new Error("db exploded"));

    await expect(reviewSubmission("SUB001", { status: "APPROVED" }, "ADM001")).rejects.toThrow("db exploded");

    expect(mockEvaluateAndIssueBadges).not.toHaveBeenCalled();
  });

  it("never creates a points event on rejection", async () => {
    mockFindSubmissionById.mockResolvedValue(pendingSubmission);
    mockUpdateSubmissionIfPending.mockResolvedValue({ count: 1 });

    await reviewSubmission("SUB001", { status: "REJECTED" }, "ADM001");

    expect(mockUpdateSubmissionIfPending).toHaveBeenCalledWith(
      "SUB001",
      expect.objectContaining({ status: "REJECTED" }),
      fakeTx
    );
    expect(mockCreatePointsEventForMissionCompletion).not.toHaveBeenCalled();
    expect(mockEvaluateAndIssueBadges).not.toHaveBeenCalled();
  });

  it("does not fail the request when badge evaluation fails after a successful approval", async () => {
    mockFindSubmissionById.mockResolvedValue(pendingSubmission);
    mockFindMissionById.mockResolvedValue(quantityMission);
    mockUpdateSubmissionIfPending.mockResolvedValue({ count: 1 });
    mockGetApprovedMissionProgressForUser.mockResolvedValue({ approvedCount: 1, approvedQuantity: 20 });
    mockCreatePointsEventForMissionCompletion.mockResolvedValue({ id: "PEV001" });
    mockEvaluateAndIssueBadges.mockRejectedValue(new Error("badge engine down"));

    await expect(reviewSubmission("SUB001", { status: "APPROVED" }, "ADM001")).resolves.toBeDefined();
  });
});

describe("submitMission auto-approve", () => {
  const autoApproveMission = {
    id: "MIS002",
    type: "TIME_LIMITED",
    points: 50,
    autoApprove: true,
    isActive: true,
    status: "ACTIVE",
    startAt: new Date(Date.now() - 1000),
    endAt: new Date(Date.now() + 100000),
    submissionCap: null
  };

  it("wraps creation and the points award in the same transaction", async () => {
    mockFindMissionById.mockResolvedValue(autoApproveMission);
    mockFindUserSubmissionForMissionByStatuses.mockResolvedValue(null);
    mockFindActiveUserSubmissionForMission.mockResolvedValue(null);
    mockCreateSubmission.mockResolvedValue({ id: "SUB-TEST", userId: "USR001", missionId: "MIS002" });
    mockGetApprovedMissionProgressForUser.mockResolvedValue({ approvedCount: 1, approvedQuantity: 0 });
    mockCreatePointsEventForMissionCompletion.mockResolvedValue({ id: "PEV002" });
    mockEvaluateAndIssueBadges.mockResolvedValue([]);

    await submitMission("MIS002", {}, "USR001");

    expect(mockCreateSubmission).toHaveBeenCalledWith(expect.objectContaining({ status: "APPROVED" }), fakeTx);
    expect(mockCreatePointsEventForMissionCompletion).toHaveBeenCalledWith(
      expect.objectContaining({ submissionId: "SUB-TEST", client: fakeTx })
    );
  });

  it("aborts submission creation entirely when the points award fails", async () => {
    mockFindMissionById.mockResolvedValue(autoApproveMission);
    mockFindUserSubmissionForMissionByStatuses.mockResolvedValue(null);
    mockFindActiveUserSubmissionForMission.mockResolvedValue(null);
    mockCreateSubmission.mockResolvedValue({ id: "SUB-TEST", userId: "USR001", missionId: "MIS002" });
    mockGetApprovedMissionProgressForUser.mockResolvedValue({ approvedCount: 1, approvedQuantity: 0 });
    mockCreatePointsEventForMissionCompletion.mockRejectedValue(new Error("db exploded"));
    // A real $transaction would reject the same way a thrown error inside the
    // callback does; this mock's default implementation already propagates it.

    await expect(submitMission("MIS002", {}, "USR001")).rejects.toThrow("db exploded");
    expect(mockEvaluateAndIssueBadges).not.toHaveBeenCalled();
  });

  it("rejects with 429 when resubmitting an auto-approve mission within the cooldown window", async () => {
    mockFindMissionById.mockResolvedValue(autoApproveMission);
    mockFindUserSubmissionForMissionByStatuses.mockResolvedValue(null);
    mockFindActiveUserSubmissionForMission.mockResolvedValue({
      id: "SUB-PRIOR",
      submittedAt: new Date(Date.now() - 10 * 1000)
    });

    await expect(submitMission("MIS002", {}, "USR001")).rejects.toMatchObject({ statusCode: 429 });
    expect(mockCreateSubmission).not.toHaveBeenCalled();
  });

  it("allows resubmitting an auto-approve mission once the cooldown window has passed", async () => {
    mockFindMissionById.mockResolvedValue(autoApproveMission);
    mockFindUserSubmissionForMissionByStatuses.mockResolvedValue(null);
    mockFindActiveUserSubmissionForMission.mockResolvedValue({
      id: "SUB-PRIOR",
      submittedAt: new Date(Date.now() - 61 * 1000)
    });
    mockCreateSubmission.mockResolvedValue({ id: "SUB-TEST", userId: "USR001", missionId: "MIS002" });
    mockGetApprovedMissionProgressForUser.mockResolvedValue({ approvedCount: 1, approvedQuantity: 0 });
    mockCreatePointsEventForMissionCompletion.mockResolvedValue({ id: "PEV003" });
    mockEvaluateAndIssueBadges.mockResolvedValue([]);

    await expect(submitMission("MIS002", {}, "USR001")).resolves.toBeDefined();
    expect(mockCreateSubmission).toHaveBeenCalled();
  });

  it("does not apply the cooldown to manual-review missions", async () => {
    mockFindMissionById.mockResolvedValue({ ...autoApproveMission, autoApprove: false });
    mockFindUserSubmissionForMissionByStatuses.mockResolvedValue(null);
    mockCreateSubmission.mockResolvedValue({ id: "SUB-TEST", userId: "USR001", missionId: "MIS002" });

    await expect(submitMission("MIS002", {}, "USR001")).resolves.toBeDefined();
    expect(mockFindActiveUserSubmissionForMission).not.toHaveBeenCalled();
  });
});
