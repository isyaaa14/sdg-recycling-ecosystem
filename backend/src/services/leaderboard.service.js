import {
  findStudents,
  groupApprovedRecyclingSubmissionsByUser,
  groupPointsByUser
} from "../repositories/leaderboard.repository.js";

const EARNING_EVENT_TYPES = ["MISSION_COMPLETED", "RECYCLING_APPROVED", "ADMIN_ADJUSTMENT"];

export class LeaderboardServiceError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function timeframeRange(timeframe) {
  if (!["daily", "weekly", "all_time"].includes(timeframe)) {
    throw new LeaderboardServiceError(400, "Invalid leaderboard timeframe.");
  }

  if (timeframe === "all_time") {
    return {};
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  if (timeframe === "weekly") {
    const day = start.getDay();
    const daysSinceMonday = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - daysSinceMonday);
  }

  return { gte: start };
}

// Grouped aggregates instead of one query per student: previously this ran
// 3 queries per student (N+1), which doesn't scale with the student count
// and wasn't backed by an index on PointsEvent.userId. Backed by the new
// PointsEvent(userId, eventType) index added alongside this fix.
async function sumPointsByUser(range, lifetime = false) {
  const where = {
    eventType: { in: EARNING_EVENT_TYPES },
    points: { gt: 0 }
  };

  if (!lifetime && range.gte) {
    where.approvedAt = range;
  }

  const grouped = await groupPointsByUser(where);
  return new Map(grouped.map((row) => [row.userId, row._sum.points ?? 0]));
}

async function countApprovedRecyclingSubmissionsByUser(range) {
  const where = { status: "APPROVED" };
  if (range.gte) {
    where.reviewedAt = range;
  }

  const grouped = await groupApprovedRecyclingSubmissionsByUser(where);
  return new Map(grouped.map((row) => [row.userId, row._count._all]));
}

export async function getLeaderboard(query = {}) {
  const timeframe = query.timeframe ?? "all_time";
  const range = timeframeRange(timeframe);
  const minimumApprovedRecyclingSubmissions = timeframe === "daily" ? 1 : 3;

  const [students, totalPointsByUser, lifetimePointsByUser, approvedCountByUser] = await Promise.all([
    findStudents(),
    sumPointsByUser(range, timeframe === "all_time"),
    sumPointsByUser({}, true),
    countApprovedRecyclingSubmissionsByUser(range)
  ]);

  const evaluated = students.map((user) => ({
    user,
    totalPoints: totalPointsByUser.get(user.id) ?? 0,
    lifetimePoints: lifetimePointsByUser.get(user.id) ?? 0,
    approvedRecyclingSubmissionCount: approvedCountByUser.get(user.id) ?? 0
  }));

  const qualified = evaluated
    .filter((entry) =>
      timeframe === "all_time"
        ? entry.lifetimePoints > 0 || entry.approvedRecyclingSubmissionCount >= minimumApprovedRecyclingSubmissions
        : entry.approvedRecyclingSubmissionCount >= minimumApprovedRecyclingSubmissions
    )
    .sort((a, b) => {
      const pointDelta = timeframe === "all_time"
        ? b.lifetimePoints - a.lifetimePoints
        : b.totalPoints - a.totalPoints;
      if (pointDelta !== 0) return pointDelta;
      return b.approvedRecyclingSubmissionCount - a.approvedRecyclingSubmissionCount;
    })
    .slice(0, 50);

  const entries = qualified.map((entry, index) => ({
    rank: index + 1,
    full_name: entry.user.name,
    lifetime_points: entry.lifetimePoints,
    total_points: timeframe === "all_time" ? entry.lifetimePoints : entry.totalPoints,
    user_id: entry.user.id,
    rank_change: null,
    approved_recycling_submissions: entry.approvedRecyclingSubmissionCount
  }));

  return {
    timeframe,
    generated_at: new Date().toISOString(),
    minimumApprovedRecyclingSubmissions,
    entries
  };
}
