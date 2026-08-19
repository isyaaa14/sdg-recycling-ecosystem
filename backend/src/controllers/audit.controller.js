import { listAuditLogs, AuditServiceError } from "../services/audit.service.js";

function handleError(error, response) {
  if (error instanceof AuditServiceError) {
    return response.status(error.statusCode).json({ error: { message: error.message } });
  }
  console.error(error);
  return response.status(500).json({ error: { message: "Internal server error" } });
}

export async function listAuditLogsHandler(request, response) {
  try {
    const result = await listAuditLogs(request.query);
    return response.json({ data: result });
  } catch (error) {
    return handleError(error, response);
  }
}
