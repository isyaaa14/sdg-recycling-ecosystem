import { jest, describe, it, expect, beforeEach } from "@jest/globals";

const mockFindStudents = jest.fn();
const mockGroupPointsByUser = jest.fn();
const mockGroupApprovedRecyclingSubmissionsByUser = jest.fn();

jest.unstable_mockModule("../../repositories/leaderboard.repository.js", () => ({
  findStudents: mockFindStudents,
  groupPointsByUser: mockGroupPointsByUser,
  groupApprovedRecyclingSubmissionsByUser: mockGroupApprovedRecyclingSubmissionsByUser
}));

const { getLeaderboard } = await import("../../services/leaderboard.service.js");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getLeaderboard", () => {
  it("returns ranked results in the right order for the default all_time timeframe", async () => {
    mockFindStudents.mockResolvedValue([
      { id: "USR001", name: "Alice", email: "alice@example.com" },
      { id: "USR002", name: "Bob", email: "bob@example.com" }
    ]);
    mockGroupPointsByUser.mockResolvedValue([
      { userId: "USR001", _sum: { points: 50 } },
      { userId: "USR002", _sum: { points: 200 } }
    ]);
    mockGroupApprovedRecyclingSubmissionsByUser.mockResolvedValue([
      { userId: "USR001", _count: { _all: 5 } },
      { userId: "USR002", _count: { _all: 1 } }
    ]);

    const result = await getLeaderboard();

    expect(result.entries).toHaveLength(2);
    expect(result.entries[0].user_id).toBe("USR002");
    expect(result.entries[0].rank).toBe(1);
    expect(result.entries[1].user_id).toBe("USR001");
    expect(result.entries[1].rank).toBe(2);
  });

  it("rejects an invalid timeframe", async () => {
    await expect(getLeaderboard({ timeframe: "monthly" })).rejects.toMatchObject({ statusCode: 400 });
  });
});
