import { getLeaderboard, LeaderboardServiceError } from "../services/leaderboard.service.js";

function handleError(error, response) {
  if (error instanceof LeaderboardServiceError) {
    return response.status(error.statusCode).json({ error: { message: error.message } });
  }
  console.error(error);
  return response.status(500).json({ error: { message: "Internal server error" } });
}

export async function getLeaderboardHandler(request, response) {
  try {
    const leaderboard = await getLeaderboard(request.query);
    return response.json({ data: leaderboard });
  } catch (error) {
    return handleError(error, response);
  }
}
