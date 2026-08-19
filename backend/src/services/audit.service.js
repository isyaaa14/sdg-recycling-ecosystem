import { findAuditLogs, countAuditLogs } from "../repositories/audit.repository.js";

export class AuditServiceError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

export async function listAuditLogs(query = {}) {
  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit) || 20, 1), 100);

  const where = {};

  if (query.action) {
    where.action = { contains: query.action };
  }

  if (query.userId) {
    where.userId = query.userId;
  }

  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    findAuditLogs({ where, skip, take: limit }),
    countAuditLogs({ where })
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}
