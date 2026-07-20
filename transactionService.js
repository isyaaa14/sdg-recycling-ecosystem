const prisma = require("../prismaClient");

exports.getMyTransactions = async (user) => {
  if (!user || !user.id) {
    throw new Error("Authentication required.");
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: user.id
    },
    orderBy: {
      createdAt: "desc"
    },
    include: {
      qr: {
        select: {
          id: true,
          status: true,
          expiresAt: true,
          createdAt: true
        }
      }
    }
  });

  return transactions.map((t) => ({
    id: t.id,
    qrId: t.qrId,
    materialType: t.materialType,
    estimatedWeightKg: t.estimatedWeightKg,
    points: t.points,
    status: t.status,
    rejectionReason: t.rejectionReason,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    qrStatus: t.qr.status
  }));
};

exports.getAdminTransactions = async (user) => {
  if (!user || !["STAFF", "ADMIN"].includes(user.role)) {
    throw new Error("Access denied.");
  }

  const transactions = await prisma.transaction.findMany({
    orderBy: {
      createdAt: "desc"
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      qr: {
        select: {
          id: true,
          status: true,
          expiresAt: true,
          createdAt: true
        }
      }
    }
  });

  const rewardRates = await prisma.rewardRate.findMany({
    where: { isActive: true }
  });

  const rateMap = {};
  rewardRates.forEach((rate) => {
    rateMap[rate.materialType] = rate.pointsPerKg;
  });

  return transactions.map((t) => {
    const estimatedPoints = Math.round(
      (t.estimatedWeightKg || 0) * (rateMap[t.materialType] || 0)
    );

    return {
      id: t.id,
      qrId: t.qrId,
      userName: t.user.name,
      userEmail: t.user.email,
      materialType: t.materialType,
      estimatedWeightKg: t.estimatedWeightKg,
      estimatedPoints,
      points: t.points,
      status: t.status,
      rejectionReason: t.rejectionReason,
      createdAt: t.createdAt,
      qrStatus: t.qr.status
    };
  });
};
function ensureStaff(user) {
  if (!user || !["STAFF", "ADMIN"].includes(user.role)) {
    throw new Error("Access denied. Staff or admin only.");
  }
}



exports.approveTransaction = async (user, transactionId, body = {}) => {
  ensureStaff(user);

  const existing = await prisma.transaction.findUnique({
    where: {
      id: transactionId
    }
  });

  if (!existing) {
    throw new Error("Transaction not found.");
  }

  if (existing.status !== "CLAIMED") {
    throw new Error(`Only CLAIMED transactions can be approved. Current status: ${existing.status}`);
  }

  const rewardRate = await prisma.rewardRate.findFirst({
    where: {
        materialType: existing.materialType,
        isActive: true
    }
});

if (!rewardRate) {
    throw new Error(
        `Reward rate for '${existing.materialType}' is not configured.`
    );
}

if (!existing.estimatedWeightKg || existing.estimatedWeightKg <= 0) {
  throw new Error("Invalid recycling weight.");
}

if (rewardRate.pointsPerKg <= 0) {
  throw new Error(`Invalid reward rate for '${existing.materialType}'.`);
}

const points = Math.round(
  existing.estimatedWeightKg * rewardRate.pointsPerKg
);
  const result = await prisma.$transaction(async (tx) => {
    const updatedTransaction = await tx.transaction.update({
      where: {
        id: existing.id
      },
      data: {
        status: "APPROVED",
        points
      }
    });

    const ledgerEntry = await tx.ledgerEntry.create({
      data: {
        userId: existing.userId,
        transactionId: existing.id,
        points,
        type: "EARN",
        description: `${existing.materialType} (${existing.estimatedWeightKg} kg) recycling approved`
      }
    });

    await tx.transactionHistory.create({
      data: {
        transactionId: existing.id,
        fromStatus: "CLAIMED",
        toStatus: "APPROVED",
        changedBy: user.id,
        remarks: body.remarks || `Approved (${points} points awarded)`
      }
    });

    await tx.auditLog.create({
      data: {
        action: "TRANSACTION_APPROVED",
        userId: user.id,
        transactionId: existing.id,
        details: {
    transactionId: existing.id,
    materialType: existing.materialType,
    weightKg: existing.estimatedWeightKg,
    rewardRate: rewardRate.pointsPerKg,
    awardedPoints: points,
    approvedBy: user.id
}
      }
    });

    return {
      updatedTransaction,
      ledgerEntry
    };
  });

  return {
    message: "Transaction approved successfully",
    transactionId: result.updatedTransaction.id,
    status: result.updatedTransaction.status,
    points: result.updatedTransaction.points,
    ledgerEntryId: result.ledgerEntry.id
  };
};

exports.rejectTransaction = async (user, transactionId, body = {}) => {
  ensureStaff(user);

  const existing = await prisma.transaction.findUnique({
    where: {
      id: transactionId
    }
  });

  if (!existing) {
    throw new Error("Transaction not found.");
  }

  if (existing.status !== "CLAIMED") {
    throw new Error(`Only CLAIMED transactions can be rejected. Current status: ${existing.status}`);
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedTransaction = await tx.transaction.update({
      where: {
        id: existing.id
      },
      data: {
        status: "REJECTED",
        rejectionReason: body.remarks || "Rejected by staff/admin"
      }
    });

    await tx.transactionHistory.create({
      data: {
        transactionId: existing.id,
        fromStatus: "CLAIMED",
        toStatus: "REJECTED",
        changedBy: user.id,
        remarks: body.remarks || "Transaction rejected"
      }
    });

    await tx.auditLog.create({
      data: {
        action: "TRANSACTION_REJECTED",
        userId: user.id,
        transactionId: existing.id,
        details: {
          rejectedUserId: existing.userId,
          reason: body.remarks || "Rejected by staff/admin"
        }
      }
    });

    return updatedTransaction;
  });

  return {
    message: "Transaction rejected successfully",
    transactionId: result.id,
    status: result.status
  };
};
