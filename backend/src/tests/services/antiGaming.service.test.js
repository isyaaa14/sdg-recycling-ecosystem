import { jest, describe, it, expect, beforeEach } from "@jest/globals";

const mockSumDailyRecyclingPointsForUser = jest.fn();
jest.unstable_mockModule("../../repositories/points.repository.js", () => ({
  sumDailyRecyclingPointsForUser: mockSumDailyRecyclingPointsForUser
}));

const mockCreateWithGeneratedId = jest.fn((model, prefix, createFn) => createFn(`${prefix}-TEST`));
jest.unstable_mockModule("../../utils/idGenerator.js", () => ({
  createWithGeneratedId: mockCreateWithGeneratedId
}));

const mockCountRecyclingSubmissionsSince = jest.fn();
const mockCreateSuspiciousActivityLog = jest.fn();
const mockFindPointRate = jest.fn();
const mockFindSimilarRecentSubmission = jest.fn();
const mockFindSuspiciousActivities = jest.fn();
const mockFindUserForAntiGaming = jest.fn();
const mockRunInTransaction = jest.fn((callback) => callback({}));
const mockSetUserSuspiciousFlagRecord = jest.fn();

jest.unstable_mockModule("../../repositories/antiGaming.repository.js", () => ({
  countRecyclingSubmissionsSince: mockCountRecyclingSubmissionsSince,
  createSuspiciousActivityLog: mockCreateSuspiciousActivityLog,
  findPointRate: mockFindPointRate,
  findSimilarRecentSubmission: mockFindSimilarRecentSubmission,
  findSuspiciousActivities: mockFindSuspiciousActivities,
  findUserForAntiGaming: mockFindUserForAntiGaming,
  runInTransaction: mockRunInTransaction,
  setUserSuspiciousFlag: mockSetUserSuspiciousFlagRecord
}));

const { getAntiGamingStatus, setUserSuspiciousFlag, validateRecyclingSubmission } = await import(
  "../../services/antiGaming.service.js"
);

const cleanUser = { id: "USR001", suspiciousActivityFlagged: false, lastRecyclingSubmissionAt: null };

beforeEach(() => {
  jest.clearAllMocks();
  mockRunInTransaction.mockImplementation((callback) => callback({}));
});

describe("validateRecyclingSubmission", () => {
  it("rejects a user already flagged for suspicious activity", async () => {
    mockFindUserForAntiGaming.mockResolvedValue({ ...cleanUser, suspiciousActivityFlagged: true });

    await expect(validateRecyclingSubmission("USR001", "Plastic", 2)).rejects.toMatchObject({ statusCode: 403 });
  });

  it("rejects and logs a duplicate submission within the window", async () => {
    mockFindUserForAntiGaming.mockResolvedValue(cleanUser);
    mockFindPointRate.mockResolvedValue({ material: "Plastic", ratePerKg: 50 });
    mockFindSimilarRecentSubmission.mockResolvedValue({ id: "RCS-OLD" });

    await expect(validateRecyclingSubmission("USR001", "Plastic", 2)).rejects.toMatchObject({ statusCode: 409 });

    expect(mockCreateSuspiciousActivityLog).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "USR001", activityType: "duplicate_submission" }),
      expect.anything()
    );
  });

  it("rejects and logs when the hourly submission limit is exceeded", async () => {
    mockFindUserForAntiGaming.mockResolvedValue(cleanUser);
    mockFindPointRate.mockResolvedValue({ material: "Plastic", ratePerKg: 50 });
    mockFindSimilarRecentSubmission.mockResolvedValue(null);
    mockCountRecyclingSubmissionsSince.mockResolvedValue(10);

    await expect(validateRecyclingSubmission("USR001", "Plastic", 2)).rejects.toMatchObject({ statusCode: 429 });

    expect(mockCreateSuspiciousActivityLog).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "USR001", activityType: "hourly_limit_exceeded" }),
      expect.anything()
    );
  });

  it("rejects and logs an oversized submission that alone exceeds the daily point cap", async () => {
    mockFindUserForAntiGaming.mockResolvedValue(cleanUser);
    mockFindPointRate.mockResolvedValue({ material: "Plastic", ratePerKg: 50 });
    mockFindSimilarRecentSubmission.mockResolvedValue(null);
    mockCountRecyclingSubmissionsSince.mockResolvedValue(0);
    mockSumDailyRecyclingPointsForUser.mockResolvedValue(0);

    await expect(validateRecyclingSubmission("USR001", "Plastic", 25)).rejects.toMatchObject({ statusCode: 400 });

    expect(mockCreateSuspiciousActivityLog).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "USR001", activityType: "oversized_submission" }),
      expect.anything()
    );
  });

  it("passes a clean submission with no suspicious-activity log created", async () => {
    mockFindUserForAntiGaming.mockResolvedValue(cleanUser);
    mockFindPointRate.mockResolvedValue({ material: "Plastic", ratePerKg: 50 });
    mockFindSimilarRecentSubmission.mockResolvedValue(null);
    mockCountRecyclingSubmissionsSince.mockResolvedValue(0);
    mockSumDailyRecyclingPointsForUser.mockResolvedValue(0);

    const result = await validateRecyclingSubmission("USR001", "Plastic", 2);

    expect(result).toEqual({ ratePerKg: 50, estimatedPoints: 100 });
    expect(mockCreateSuspiciousActivityLog).not.toHaveBeenCalled();
  });
});

describe("getAntiGamingStatus", () => {
  it("returns the expected status shape on the happy path", async () => {
    mockFindUserForAntiGaming.mockResolvedValue(cleanUser);
    mockSumDailyRecyclingPointsForUser.mockResolvedValue(200);
    mockCountRecyclingSubmissionsSince.mockResolvedValue(3);

    const result = await getAntiGamingStatus("USR001");

    expect(result).toEqual({
      suspiciousActivityFlagged: false,
      dailyPoints: 200,
      remainingDailyPoints: 800,
      submissionsThisHour: 3,
      maxSubmissionsPerHour: 10,
      secondsUntilNextSubmission: 0,
      maxDailyPoints: 1000
    });
  });
});

describe("setUserSuspiciousFlag", () => {
  it("toggles the flag and logs the manual admin action when a reason is given", async () => {
    mockSetUserSuspiciousFlagRecord.mockResolvedValue({ id: "USR001", suspiciousActivityFlagged: true });
    mockCreateSuspiciousActivityLog.mockResolvedValue({ id: "SAL-TEST" });

    const result = await setUserSuspiciousFlag("USR001", true, "Repeated abuse", "ADM001");

    expect(mockSetUserSuspiciousFlagRecord).toHaveBeenCalledWith("USR001", true);
    expect(mockCreateSuspiciousActivityLog).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "USR001", activityType: "manual_flag" })
    );
    expect(result.suspiciousActivityFlagged).toBe(true);
  });
});
