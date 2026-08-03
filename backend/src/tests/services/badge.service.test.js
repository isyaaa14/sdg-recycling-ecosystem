import { jest, describe, it, expect, beforeEach } from "@jest/globals";

const mockCreateBadgeRecord = jest.fn();
const mockFindBadgeById = jest.fn();
const mockFindBadgeBySlug = jest.fn();
const mockFindActiveBadges = jest.fn();
const mockFindAllBadges = jest.fn();
const mockUpdateBadgeRecord = jest.fn();
const mockFindBadgeAward = jest.fn();
const mockCreateBadgeAward = jest.fn();
const mockFindAwardsByBadge = jest.fn();
const mockCountApprovedMissionSubmissions = jest.fn();
const mockCountApprovedRecyclingSubmissions = jest.fn();
const mockCountCompletedMissions = jest.fn();
const mockCountPassedQuizAttempts = jest.fn();
const mockCountCompletedLearningProgress = jest.fn();

jest.unstable_mockModule("../../repositories/badge.repository.js", () => ({
  createBadge: mockCreateBadgeRecord,
  findBadgeById: mockFindBadgeById,
  findBadgeBySlug: mockFindBadgeBySlug,
  findActiveBadges: mockFindActiveBadges,
  findAllBadges: mockFindAllBadges,
  updateBadge: mockUpdateBadgeRecord,
  findBadgeAward: mockFindBadgeAward,
  createBadgeAward: mockCreateBadgeAward,
  findAwardsByBadge: mockFindAwardsByBadge,
  countApprovedMissionSubmissions: mockCountApprovedMissionSubmissions,
  countApprovedRecyclingSubmissions: mockCountApprovedRecyclingSubmissions,
  countCompletedMissions: mockCountCompletedMissions,
  countPassedQuizAttempts: mockCountPassedQuizAttempts,
  countCompletedLearningProgress: mockCountCompletedLearningProgress
}));

const mockCreateWithGeneratedId = jest.fn((model, prefix, createFn) => createFn(`${prefix}-TEST`));
jest.unstable_mockModule("../../utils/idGenerator.js", () => ({
  createWithGeneratedId: mockCreateWithGeneratedId
}));

const { evaluateAndIssueBadges } = await import("../../services/badge.service.js");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("evaluateAndIssueBadges", () => {
  it("awards a badge when the criteria count meets the threshold", async () => {
    mockFindActiveBadges.mockResolvedValue([{ id: "BDG001", criteriaType: "QUIZZES_PASSED", criteriaValue: 3 }]);
    mockCountPassedQuizAttempts.mockResolvedValue(3);
    mockFindBadgeAward.mockResolvedValue(null);
    mockCreateBadgeAward.mockResolvedValue({ id: "AWD-TEST", userId: "USR001", badgeId: "BDG001" });

    const result = await evaluateAndIssueBadges("USR001");

    expect(mockCreateBadgeAward).toHaveBeenCalledWith("USR001", "BDG001");
    expect(result).toHaveLength(1);
  });

  it("does not re-award a badge the user already has", async () => {
    mockFindActiveBadges.mockResolvedValue([{ id: "BDG001", criteriaType: "QUIZZES_PASSED", criteriaValue: 3 }]);
    mockCountPassedQuizAttempts.mockResolvedValue(5);
    mockFindBadgeAward.mockResolvedValue({ id: "AWD-EXISTING" });

    const result = await evaluateAndIssueBadges("USR001");

    expect(mockCreateBadgeAward).not.toHaveBeenCalled();
    expect(result).toHaveLength(0);
  });
});
