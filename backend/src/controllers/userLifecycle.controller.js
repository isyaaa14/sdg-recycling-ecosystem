import {
  UserLifecycleServiceError,
  listUnreadAdminNotifications,
  markNotificationsRead,
  reactivateStudent,
  sweepInactiveStudents
} from "../services/userLifecycle.service.js";

function handleError(error, response) {
  if (error instanceof UserLifecycleServiceError) {
    return response.status(error.statusCode).json({ error: { message: error.message } });
  }
  console.error(error);
  return response.status(500).json({ error: { message: "Internal server error" } });
}

export async function getAdminNotificationsHandler(request, response) {
  try {
    const notifications = await listUnreadAdminNotifications();
    return response.json({ data: { notifications } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function markNotificationsReadHandler(request, response) {
  try {
    const result = await markNotificationsRead(request.body.notificationIds, request.user.id);
    return response.json({ data: { updatedCount: result.count } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function reactivateStudentHandler(request, response) {
  try {
    const user = await reactivateStudent(request.params.userId);
    return response.json({ data: { user } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function runInactivitySweepHandler(request, response) {
  try {
    const result = await sweepInactiveStudents();
    return response.json({ data: result });
  } catch (error) {
    return handleError(error, response);
  }
}
