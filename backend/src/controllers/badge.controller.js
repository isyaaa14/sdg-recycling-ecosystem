import {
  createBadge,
  computeBadgeProgress,
  evaluateAndIssueBadges,
  BadgeServiceError
} from "../services/badge.service.js";

function handleError(error, response) {
  if (error instanceof BadgeServiceError) {
    return response.status(error.statusCode).json({ error: { message: error.message } });
  }
  console.error(error);
  return response.status(500).json({ error: { message: "Internal server error" } });
}

export async function createBadgeHandler(request, response) {
  try {
    const badge = await createBadge(request.body);
    return response.status(201).json({ data: { badge } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function getBadgeProgressHandler(request, response) {
  try {
    await evaluateAndIssueBadges(request.user.id);
    const progress = await computeBadgeProgress(request.user.id);
    return response.status(200).json({ data: { earned: progress.earned, locked: progress.locked } });
  } catch (error) {
    return handleError(error, response);
  }
}
