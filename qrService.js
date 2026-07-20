const prisma = require("../prismaClient");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const { signPayload, verifyPayload } = require("../utils/qrSigner");

function ensureStaff(user) {
  if (!user || !["staff", "admin", "STAFF", "ADMIN"].includes(user.role)) {
    throw new Error("Access denied. Staff or admin only.");
  }
}

function ensureUser(user) {
  if (!user || !user.id) {
    throw new Error("Authentication required.");
  }
}

exports.issueQR = async (user, data) => {
  ensureStaff(user);

  const qrId = uuidv4();
  const nonce = crypto.randomBytes(16).toString("hex");

  const expiresInMinutes = data.expiresInMinutes || 5;
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  const payload = {
    qrId,
    nonce,
    type: data.type || "deposit",
    materialType: data.materialType || null,
    estimatedWeightKg: data.estimatedWeightKg || null,
    expiresAt: expiresAt.toISOString()
  };

  const signature = signPayload(payload);

  const qr = await prisma.qRCode.create({
    data: {
      id: qrId,
      nonce,
      signature,
      status: "ISSUED",
      expiresAt,
      issuedBy: user.id,
      payload: JSON.stringify(payload)
    }
  });

  return {
    message: "QR issued successfully",
    qrId: qr.id,
    status: qr.status,
    expiresAt: qr.expiresAt,
    payload,
    signature,
    signedPayload: {
      payload,
      signature
    }
  };
};

exports.getQRStatus = async (qrId) => {
  const qr = await prisma.qRCode.findUnique({
    where: {
      id: qrId
    }
  });

  if (!qr) {
    throw new Error("QR not found");
  }

  let status = qr.status;

  if (qr.status === "ISSUED" && new Date() > qr.expiresAt) {
    status = "EXPIRED";

    await prisma.qRCode.update({
      where: {
        id: qr.id
      },
      data: {
        status: "EXPIRED"
      }
    });
  }

  return {
    qrId: qr.id,
    status,
    expiresAt: qr.expiresAt,
    issuedBy: qr.issuedBy,
    createdAt: qr.createdAt
  };
};

exports.claimQR = async (user, data) => {
  ensureUser(user);

  const { payload, signature } = data;

  if (!payload || !signature) {
    throw new Error("Payload and signature are required.");
  }

  const isValidSignature = verifyPayload(payload, signature);

  if (!isValidSignature) {
    await prisma.auditLog.create({
      data: {
        action: "QR_INVALID_SIGNATURE",
        userId: user.id,
        details: JSON.stringify({
          payload
        })
      }
    });

    throw new Error("Invalid QR signature.");
  }

  const qr = await prisma.qRCode.findUnique({
    where: {
      id: payload.qrId
    }
  });

  if (!qr) {
    throw new Error("QR not found.");
  }

  if (qr.nonce !== payload.nonce) {
    await prisma.auditLog.create({
      data: {
        action: "QR_NONCE_MISMATCH",
        userId: user.id,
        qrId: qr.id,
        details: JSON.stringify({
          receivedNonce: payload.nonce
        })
      }
    });

    throw new Error("Invalid QR nonce.");
  }

  if (qr.status !== "ISSUED") {
    await prisma.auditLog.create({
      data: {
        action: "QR_REPLAY_ATTEMPT",
        userId: user.id,
        qrId: qr.id,
        details: JSON.stringify({
          currentStatus: qr.status
        })
      }
    });

    throw new Error("QR already used or invalid.");
  }

  if (new Date() > qr.expiresAt) {
    await prisma.qRCode.update({
      where: {
        id: qr.id
      },
      data: {
        status: "EXPIRED"
      }
    });

    throw new Error("QR expired.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedQR = await tx.qRCode.update({
      where: {
        id: qr.id
      },
      data: {
        status: "CLAIMED",
        claimedBy: user.id,
        claimedAt: new Date()
      }
    });

    const transaction = await tx.transaction.create({
      data: {
        userId: user.id,
        qrId: qr.id,
        status: "CLAIMED",
        materialType: payload.materialType,
        estimatedWeightKg: payload.estimatedWeightKg
      }
    });

    await tx.transactionHistory.create({
      data: {
        transactionId: transaction.id,
        fromStatus: "ISSUED",
        toStatus: "CLAIMED",
        changedBy: user.id,
        remarks: "QR claimed by user"
      }
    });

    await tx.auditLog.create({
      data: {
        action: "QR_CLAIMED",
        userId: user.id,
        qrId: qr.id,
        transactionId: transaction.id,
        details: JSON.stringify({
          materialType: payload.materialType,
          estimatedWeightKg: payload.estimatedWeightKg
        })
      }
    });

    return {
      updatedQR,
      transaction
    };
  });

  return {
    message: "QR claimed successfully",
    qrId: result.updatedQR.id,
    transactionId: result.transaction.id,
    status: result.transaction.status
  };
};

exports.invalidateQR = async (user, qrId) => {
  ensureStaff(user);

  const qr = await prisma.qRCode.findUnique({
    where: {
      id: qrId
    }
  });

  if (!qr) {
    throw new Error("QR not found.");
  }

  if (qr.status !== "issued") {
    throw new Error(`Only issued QR can be invalidated. Current status: ${qr.status}`);
  }

  const updatedQR = await prisma.qRCode.update({
    where: {
      id: qr.id
    },
    data: {
      status: "INVALIDATED",
      invalidatedBy: user.id,
      invalidatedAt: new Date()
    }
  });

  await prisma.auditLog.create({
    data: {
      action: "QR_INVALIDATED",
      userId: user.id,
      qrId: qr.id,
      details: JSON.stringify({
        previousStatus: qr.status
      })
    }
  });

  return {
    message: "QR invalidated successfully",
    qrId: updatedQR.id,
    status: updatedQR.status
  };
};
