import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";

// Must be set before config.js (imported transitively by recycling.service.js
// and by the real, unmocked utils/qrSigner.js) is first evaluated.
process.env.QR_SIGNING_SECRET = "test-qr-secret";

const fakeTx = { __tx: true };

const mockClaimRecyclingQrCodeIfIssued = jest.fn();
const mockCreateRecyclingQrCode = jest.fn();
const mockCreateRecyclingSubmissionRepo = jest.fn();
const mockExpireIssuedQrCodes = jest.fn();
const mockFindRecyclingQrCodeById = jest.fn();
const mockFindRecyclingQrCodes = jest.fn();
const mockFindRecyclingSubmissionById = jest.fn();
const mockFindRecyclingSubmissions = jest.fn();
const mockListPointRatesRepo = jest.fn();
const mockRunInTransaction = jest.fn((arg) => (typeof arg === "function" ? arg(fakeTx) : Promise.all(arg)));
const mockTouchUserLastRecyclingSubmission = jest.fn();
const mockUpdateRecyclingQrCode = jest.fn();
const mockUpdateRecyclingSubmissionIfPending = jest.fn();
const mockUpdateUploadedFile = jest.fn();
const mockUpsertPointRate = jest.fn();

jest.unstable_mockModule("../../repositories/recycling.repository.js", () => ({
  claimRecyclingQrCodeIfIssued: mockClaimRecyclingQrCodeIfIssued,
  createRecyclingQrCode: mockCreateRecyclingQrCode,
  createRecyclingSubmission: mockCreateRecyclingSubmissionRepo,
  expireIssuedQrCodes: mockExpireIssuedQrCodes,
  findRecyclingQrCodeById: mockFindRecyclingQrCodeById,
  findRecyclingQrCodes: mockFindRecyclingQrCodes,
  findRecyclingSubmissionById: mockFindRecyclingSubmissionById,
  findRecyclingSubmissions: mockFindRecyclingSubmissions,
  listPointRates: mockListPointRatesRepo,
  runInTransaction: mockRunInTransaction,
  touchUserLastRecyclingSubmission: mockTouchUserLastRecyclingSubmission,
  updateRecyclingQrCode: mockUpdateRecyclingQrCode,
  updateRecyclingSubmissionIfPending: mockUpdateRecyclingSubmissionIfPending,
  updateUploadedFile: mockUpdateUploadedFile,
  upsertPointRate: mockUpsertPointRate
}));

const mockCreatePointsEventForRecyclingApproval = jest.fn();
jest.unstable_mockModule("../../services/points.service.js", () => ({
  createPointsEventForRecyclingApproval: mockCreatePointsEventForRecyclingApproval
}));

const mockEvaluateAndIssueBadges = jest.fn();
jest.unstable_mockModule("../../services/badge.service.js", () => ({
  evaluateAndIssueBadges: mockEvaluateAndIssueBadges
}));

class MockAntiGamingServiceError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}
const mockGetPointRate = jest.fn();
const mockLogSuspiciousActivity = jest.fn();
const mockValidateRecyclingSubmission = jest.fn();
jest.unstable_mockModule("../../services/antiGaming.service.js", () => ({
  AntiGamingServiceError: MockAntiGamingServiceError,
  getPointRate: mockGetPointRate,
  logSuspiciousActivity: mockLogSuspiciousActivity,
  validateRecyclingSubmission: mockValidateRecyclingSubmission
}));

const mockSumDailyRecyclingPointsForUser = jest.fn();
jest.unstable_mockModule("../../repositories/points.repository.js", () => ({
  sumDailyRecyclingPointsForUser: mockSumDailyRecyclingPointsForUser
}));

const mockFindUploadedFileById = jest.fn();
jest.unstable_mockModule("../../repositories/upload.repository.js", () => ({
  findUploadedFileById: mockFindUploadedFileById
}));

const mockCreateRecyclingProofReadUrl = jest.fn();
jest.unstable_mockModule("../../services/upload.service.js", () => ({
  createRecyclingProofReadUrl: mockCreateRecyclingProofReadUrl
}));

const mockCreateWithGeneratedId = jest.fn((model, prefix, createFn) => createFn(`${prefix}-TEST`));
jest.unstable_mockModule("../../utils/idGenerator.js", () => ({
  createWithGeneratedId: mockCreateWithGeneratedId
}));

const {
  createRecyclingSubmission,
  claimRecyclingQr,
  listPointRates,
  reviewRecyclingSubmission,
  updatePointRates
} = await import("../../services/recycling.service.js");
const { signQrPayload } = await import("../../utils/qrSigner.js");

let consoleErrorSpy;

beforeEach(() => {
  jest.clearAllMocks();
  mockRunInTransaction.mockImplementation((arg) => (typeof arg === "function" ? arg(fakeTx) : Promise.all(arg)));
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("reviewRecyclingSubmission", () => {
  const existingSubmission = {
    id: "RCS001",
    userId: "USR001",
    status: "PENDING_REVIEW",
    materialType: "Plastic",
    quantity: 2
  };

  it("threads the same tx through the status update and the points event creation", async () => {
    mockFindRecyclingSubmissionById.mockResolvedValue(existingSubmission);
    mockGetPointRate.mockResolvedValue({ ratePerKg: 50 });
    mockSumDailyRecyclingPointsForUser.mockResolvedValue(0);
    mockUpdateRecyclingSubmissionIfPending.mockResolvedValue({ count: 1 });
    mockCreatePointsEventForRecyclingApproval.mockResolvedValue({ id: "PEV001" });
    mockEvaluateAndIssueBadges.mockResolvedValue([]);

    await reviewRecyclingSubmission("RCS001", { status: "APPROVED" }, "ADM001");

    expect(mockUpdateRecyclingSubmissionIfPending).toHaveBeenCalledWith(
      "RCS001",
      expect.objectContaining({ status: "APPROVED", pointsAwarded: 100 }),
      fakeTx
    );
    expect(mockCreatePointsEventForRecyclingApproval).toHaveBeenCalledWith(
      expect.objectContaining({ recyclingSubmissionId: "RCS001", client: fakeTx })
    );
  });

  it("returns 409 and never creates a points event when the atomic guard reports no row updated", async () => {
    mockFindRecyclingSubmissionById.mockResolvedValue(existingSubmission);
    mockGetPointRate.mockResolvedValue({ ratePerKg: 50 });
    mockSumDailyRecyclingPointsForUser.mockResolvedValue(0);
    mockUpdateRecyclingSubmissionIfPending.mockResolvedValue({ count: 0 });

    await expect(reviewRecyclingSubmission("RCS001", { status: "APPROVED" }, "ADM001")).rejects.toMatchObject({
      statusCode: 409
    });

    expect(mockCreatePointsEventForRecyclingApproval).not.toHaveBeenCalled();
  });

  it("aborts the whole call when creating the points event fails, and never evaluates badges", async () => {
    mockFindRecyclingSubmissionById.mockResolvedValue(existingSubmission);
    mockGetPointRate.mockResolvedValue({ ratePerKg: 50 });
    mockSumDailyRecyclingPointsForUser.mockResolvedValue(0);
    mockUpdateRecyclingSubmissionIfPending.mockResolvedValue({ count: 1 });
    mockCreatePointsEventForRecyclingApproval.mockRejectedValue(new Error("db exploded"));

    await expect(reviewRecyclingSubmission("RCS001", { status: "APPROVED" }, "ADM001")).rejects.toThrow(
      "db exploded"
    );

    expect(mockEvaluateAndIssueBadges).not.toHaveBeenCalled();
  });

  it("never creates a points event on rejection, with pointsAwarded 0", async () => {
    mockFindRecyclingSubmissionById.mockResolvedValue(existingSubmission);
    mockUpdateRecyclingSubmissionIfPending.mockResolvedValue({ count: 1 });

    await reviewRecyclingSubmission("RCS001", { status: "REJECTED" }, "ADM001");

    expect(mockUpdateRecyclingSubmissionIfPending).toHaveBeenCalledWith(
      "RCS001",
      expect.objectContaining({ status: "REJECTED", pointsAwarded: 0 }),
      fakeTx
    );
    expect(mockCreatePointsEventForRecyclingApproval).not.toHaveBeenCalled();
    expect(mockEvaluateAndIssueBadges).not.toHaveBeenCalled();
  });

  it("does not fail the request when badge evaluation fails after a successful approval", async () => {
    mockFindRecyclingSubmissionById.mockResolvedValue(existingSubmission);
    mockGetPointRate.mockResolvedValue({ ratePerKg: 50 });
    mockSumDailyRecyclingPointsForUser.mockResolvedValue(0);
    mockUpdateRecyclingSubmissionIfPending.mockResolvedValue({ count: 1 });
    mockCreatePointsEventForRecyclingApproval.mockResolvedValue({ id: "PEV001" });
    mockEvaluateAndIssueBadges.mockRejectedValue(new Error("badge engine down"));

    await expect(reviewRecyclingSubmission("RCS001", { status: "APPROVED" }, "ADM001")).resolves.toBeDefined();
  });
});

describe("createRecyclingSubmission", () => {
  it("creates a PENDING_REVIEW submission on the happy path", async () => {
    mockValidateRecyclingSubmission.mockResolvedValue(undefined);
    mockCreateRecyclingSubmissionRepo.mockResolvedValue({ id: "RCS002", submittedAt: new Date(), uploads: [] });
    mockTouchUserLastRecyclingSubmission.mockResolvedValue(undefined);

    const result = await createRecyclingSubmission({ materialType: "Plastic", quantity: 3 }, "USR001");

    expect(mockCreateRecyclingSubmissionRepo).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "USR001", source: "MANUAL", status: "PENDING_REVIEW" }),
      expect.anything(),
      fakeTx
    );
    expect(result.id).toBe("RCS002");
  });

  it("does not create a submission when the anti-gaming check rejects it", async () => {
    mockValidateRecyclingSubmission.mockRejectedValue(new MockAntiGamingServiceError(429, "Too many submissions."));

    await expect(createRecyclingSubmission({ materialType: "Plastic", quantity: 3 }, "USR001")).rejects.toMatchObject(
      { statusCode: 429 }
    );

    expect(mockCreateRecyclingSubmissionRepo).not.toHaveBeenCalled();
  });
});

describe("claimRecyclingQr", () => {
  const qrPayload = {
    qrId: "QR001",
    nonce: "abc123nonce",
    type: "recycling-deposit",
    materialType: "Plastic",
    estimatedWeightKg: 2,
    expiresAt: new Date(Date.now() + 60_000).toISOString()
  };
  const signature = signQrPayload(qrPayload);

  it("creates a QR-sourced submission and flips the QR to CLAIMED on a valid claim", async () => {
    mockFindRecyclingQrCodeById.mockResolvedValue({
      id: "QR001",
      nonce: "abc123nonce",
      signature,
      status: "ISSUED",
      expiresAt: new Date(Date.now() + 60_000)
    });
    mockValidateRecyclingSubmission.mockResolvedValue(undefined);
    mockClaimRecyclingQrCodeIfIssued.mockResolvedValue({ count: 1 });
    mockCreateRecyclingSubmissionRepo.mockResolvedValue({ id: "RCS003", submittedAt: new Date(), uploads: [] });
    mockTouchUserLastRecyclingSubmission.mockResolvedValue(undefined);

    const result = await claimRecyclingQr({ payload: qrPayload, signature }, "USR001");

    expect(mockClaimRecyclingQrCodeIfIssued).toHaveBeenCalledWith(
      "QR001",
      expect.objectContaining({ status: "CLAIMED", claimedById: "USR001" }),
      fakeTx
    );
    expect(result.id).toBe("RCS003");
  });

  it("rejects an invalid signature before touching the database", async () => {
    mockLogSuspiciousActivity.mockResolvedValue(undefined);

    await expect(
      claimRecyclingQr({ payload: qrPayload, signature: "0".repeat(64) }, "USR001")
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(mockFindRecyclingQrCodeById).not.toHaveBeenCalled();
  });

  it("rejects a QR that is no longer ISSUED (already claimed / replay)", async () => {
    mockFindRecyclingQrCodeById.mockResolvedValue({
      id: "QR001",
      nonce: "abc123nonce",
      signature,
      status: "CLAIMED",
      expiresAt: new Date(Date.now() + 60_000)
    });
    mockLogSuspiciousActivity.mockResolvedValue(undefined);

    await expect(claimRecyclingQr({ payload: qrPayload, signature }, "USR001")).rejects.toMatchObject({
      statusCode: 409
    });

    expect(mockClaimRecyclingQrCodeIfIssued).not.toHaveBeenCalled();
  });
});

describe("listPointRates / updatePointRates", () => {
  it("listPointRates returns the repository result", async () => {
    mockListPointRatesRepo.mockResolvedValue([{ material: "Plastic", ratePerKg: 50 }]);

    const result = await listPointRates();

    expect(result).toEqual([{ material: "Plastic", ratePerKg: 50 }]);
  });

  it("updatePointRates upserts every rate then returns the refreshed list", async () => {
    mockUpsertPointRate.mockResolvedValue(undefined);
    mockListPointRatesRepo.mockResolvedValue([{ material: "Plastic", ratePerKg: 60 }]);

    const result = await updatePointRates({ rates: [{ material: "Plastic", ratePerKg: 60 }] });

    expect(mockUpsertPointRate).toHaveBeenCalledWith("Plastic", 60);
    expect(result).toEqual([{ material: "Plastic", ratePerKg: 60 }]);
  });
});
