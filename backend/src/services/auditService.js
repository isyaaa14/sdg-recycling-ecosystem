const prisma = require("../prismaClient");

exports.getAuditLogs = async (user, query = {}) => {

  if (!user || !user.id) {
    throw new Error("Authentication required.");
  }

  if (user.role !== "ADMIN") {
    throw new Error("Access denied. Admin only.");
  }

  const page = Math.max(
    parseInt(query.page) || 1,
    1
  );

  const limit = Math.min(
    Math.max(parseInt(query.limit) || 20, 1),
    100
  );

  const where = {};

  // Filter by action
  if (query.action) {
    where.action = {
      contains: query.action
    };
  }

  // Filter by user
  if (query.userId) {
    where.userId = query.userId;
  }

  const [logs, total] = await Promise.all([

    prisma.auditLog.findMany({
      where,

      orderBy: {
        createdAt: "desc"
      },

      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },

      skip: (page - 1) * limit,
      take: limit
    }),

    prisma.auditLog.count({
      where
    })

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
};
