import {
  AntiGamingServiceError,
  getAntiGamingStatus,
  listSuspiciousActivities,
  setUserSuspiciousFlag
} from "../services/antiGaming.service.js";

function handleError(error, response) {
  if (error instanceof AntiGamingServiceError) {
    return response.status(error.statusCode).json({ error: { message: error.message } });
  }
  console.error(error);
  return response.status(500).json({ error: { message: "Internal server error" } });
}

export async function getMyAntiGamingStatusHandler(request, response) {
  try {
    const status = await getAntiGamingStatus(request.user.id);
    return response.json({ data: { status } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function listSuspiciousActivitiesHandler(request, response) {
  try {
    const activities = await listSuspiciousActivities(request.query);
    return response.json({ data: { activities } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function updateSuspiciousFlagHandler(request, response) {
  try {
    const flagged = Boolean(request.body.flagged ?? request.body.suspiciousActivityFlagged);
    const user = await setUserSuspiciousFlag(request.params.userId, flagged, request.body.reason, request.user.id);
    return response.json({ data: { user } });
  } catch (error) {
    return handleError(error, response);
  }
}
