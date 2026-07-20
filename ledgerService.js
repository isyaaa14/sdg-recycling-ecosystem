const prisma = require("../prismaClient");

exports.getMyLedger = async (user) => {
  if (!user || !user.id) {
    throw new Error("Authentication required.");
  }

  const entries = await prisma.ledgerEntry.findMany({
    where: {
      userId: user.id
    },
    orderBy: {
      createdAt: "desc"
    },
    include: {
      transaction: {
        select: {
          id: true,
          qrId: true,
          materialType: true,
          estimatedWeightKg: true,
          status: true
        }
      }
    }
  });

  return entries.map((entry) => ({
    id: entry.id,
    transactionId: entry.transactionId,
    qrId: entry.transaction?.qrId || null,
    points: entry.points,
    type: entry.type,
    description: entry.description,
    createdAt: entry.createdAt,
    transaction: entry.transaction
  }));
};
