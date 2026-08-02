import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
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

async function sumPoints(userId, range, lifetime = false) {
  const where = {
    userId,
    eventType: { in: EARNING_EVENT_TYPES },
    points: { gt: 0 }
  };

  if (!lifetime && range.gte) {
    where.approvedAt = range;
  }

  const result = await prisma.pointsEvent.aggregate({
    where,
    _sum: { points: true }
  });
  return result._sum.points ?? 0;
}

async function countApprovedRecyclingSubmissions(userId, range) {
  const where = { userId, status: "APPROVED" };
  if (range.gte) {
    where.reviewedAt = range;
  }

  return prisma.recyclingSubmission.count({ where });
}

export async function getLeaderboard(query = {}) {
  const timeframe = query.timeframe ?? "all_time";
  const range = timeframeRange(timeframe);
  const minimumApprovedRecyclingSubmissions = timeframe === "daily" ? 1 : 3;

  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    select: { id: true, name: true, email: true }
  });

  const evaluated = await Promise.all(
    students.map(async (user) => {
      const [totalPoints, lifetimePoints, approvedRecyclingSubmissionCount] = await Promise.all([
        sumPoints(user.id, range, timeframe === "all_time"),
        sumPoints(user.id, {}, true),
        countApprovedRecyclingSubmissions(user.id, range)
      ]);

      return {
        user,
        totalPoints,
        lifetimePoints,
        approvedRecyclingSubmissionCount
      };
    })
  );

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
