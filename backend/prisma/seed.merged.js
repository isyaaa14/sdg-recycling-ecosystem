// Seed script for docs/schema.merged.prisma (the merged live + QR/recycling/
// reward test schema). NOT wired into backend/prisma/seed.js — this seeds the
// throwaway test database described in docs/TEST_MERGED_SCHEMA.md.
//
// Run from backend/ with the test DATABASE_URL set (see that doc):
//   node prisma/seed.merged.js

import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient } from "../../docs/generated/merged-client/index.js";

const prisma = new PrismaClient();

const PASSWORD = "Password123!";

async function upsertUsers() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const users = [
    { id: "USR001", email: "admin@sdg.local", name: "Admin User", role: "ADMIN" },
    { id: "USR002", email: "student1@sdg.local", name: "Student One", role: "STUDENT" },
    { id: "USR003", email: "student2@sdg.local", name: "Student Two", role: "STUDENT" }
  ];

  const created = [];
  for (const user of users) {
    created.push(
      await prisma.user.upsert({
        where: { email: user.email },
        update: { id: user.id, name: user.name, role: user.role, passwordHash },
        create: { ...user, passwordHash }
      })
    );
  }

  return {
    admin: created.find((user) => user.role === "ADMIN"),
    students: created.filter((user) => user.role === "STUDENT")
  };
}

async function upsertRewardRates() {
  const rates = [
    { id: "RWR001", materialType: "PLASTIC", pointsPerKg: 5 },
    { id: "RWR002", materialType: "PAPER", pointsPerKg: 3 },
    { id: "RWR003", materialType: "E_WASTE", pointsPerKg: 10 }
  ];

  for (const rate of rates) {
    await prisma.rewardRate.upsert({
      where: { materialType: rate.materialType },
      update: { pointsPerKg: rate.pointsPerKg, isActive: true },
      create: rate
    });
  }

  return rates;
}

async function upsertRewards() {
  const rewards = [
    { id: "RWD001", name: "Eco Tote Bag", description: "Reusable canvas tote bag.", pointsRequired: 20, stock: 15 },
    { id: "RWD002", name: "Reusable Bottle", description: "Insulated stainless steel bottle.", pointsRequired: 35, stock: 10 },
    { id: "RWD003", name: "Campus Cafe Voucher", description: "RM5 voucher for the campus cafe.", pointsRequired: 50, stock: 5 }
  ];

  const created = [];
  for (const reward of rewards) {
    created.push(
      await prisma.reward.upsert({
        where: { name: reward.name },
        update: { ...reward },
        create: reward
      })
    );
  }

  return created;
}

async function seedQrRecyclingFlow(admin, student, rates) {
  const plasticRate = rates.find((rate) => rate.materialType === "PLASTIC");
  const estimatedWeightKg = 3.2;
  const points = Math.round(estimatedWeightKg * plasticRate.pointsPerKg);

  const qr = await prisma.qRCode.upsert({
    where: { id: "QR001" },
    update: {
      nonce: "seed-nonce-qr001",
      signature: "seed-signature-qr001",
      payload: { materialType: "PLASTIC", estimatedWeightKg },
      status: "CLAIMED",
      expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      issuedBy: admin.id,
      claimedBy: student.id,
      claimedAt: new Date()
    },
    create: {
      id: "QR001",
      nonce: "seed-nonce-qr001",
      signature: "seed-signature-qr001",
      payload: { materialType: "PLASTIC", estimatedWeightKg },
      status: "CLAIMED",
      expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      issuedBy: admin.id,
      claimedBy: student.id,
      claimedAt: new Date()
    }
  });

  const transaction = await prisma.recyclingTransaction.upsert({
    where: { id: "TXN001" },
    update: {
      userId: student.id,
      qrId: qr.id,
      status: "APPROVED",
      materialType: "PLASTIC",
      estimatedWeightKg,
      points
    },
    create: {
      id: "TXN001",
      userId: student.id,
      qrId: qr.id,
      status: "APPROVED",
      materialType: "PLASTIC",
      estimatedWeightKg,
      points
    }
  });

  await prisma.transactionHistory.upsert({
    where: { id: "TXH001" },
    update: { fromStatus: "CLAIMED", toStatus: "APPROVED", changedBy: admin.id, transactionId: transaction.id },
    create: {
      id: "TXH001",
      transactionId: transaction.id,
      fromStatus: "CLAIMED",
      toStatus: "APPROVED",
      changedBy: admin.id,
      remarks: "Weight verified at collection point."
    }
  });

  await prisma.pointsEvent.upsert({
    where: { id: "PEV101" },
    update: {
      userId: student.id,
      recyclingTransactionId: transaction.id,
      points,
      eventType: "QR_RECYCLING_APPROVED",
      status: "SENT",
      approvedAt: new Date()
    },
    create: {
      id: "PEV101",
      userId: student.id,
      recyclingTransactionId: transaction.id,
      points,
      eventType: "QR_RECYCLING_APPROVED",
      status: "SENT",
      approvedAt: new Date()
    }
  });

  await prisma.auditLog.upsert({
    where: { id: "AUD001" },
    update: {
      action: "TRANSACTION_APPROVED",
      userId: admin.id,
      qrId: qr.id,
      transactionId: transaction.id,
      details: { estimatedWeightKg, points }
    },
    create: {
      id: "AUD001",
      action: "TRANSACTION_APPROVED",
      userId: admin.id,
      qrId: qr.id,
      transactionId: transaction.id,
      details: { estimatedWeightKg, points }
    }
  });

  // Second QR/transaction pair showing the rejected path (no points event).
  const rejectedQr = await prisma.qRCode.upsert({
    where: { id: "QR002" },
    update: {
      nonce: "seed-nonce-qr002",
      signature: "seed-signature-qr002",
      payload: { materialType: "PAPER", estimatedWeightKg: 1.0 },
      status: "CLAIMED",
      expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      issuedBy: admin.id,
      claimedBy: student.id,
      claimedAt: new Date()
    },
    create: {
      id: "QR002",
      nonce: "seed-nonce-qr002",
      signature: "seed-signature-qr002",
      payload: { materialType: "PAPER", estimatedWeightKg: 1.0 },
      status: "CLAIMED",
      expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      issuedBy: admin.id,
      claimedBy: student.id,
      claimedAt: new Date()
    }
  });

  await prisma.recyclingTransaction.upsert({
    where: { id: "TXN002" },
    update: {
      userId: student.id,
      qrId: rejectedQr.id,
      status: "REJECTED",
      materialType: "PAPER",
      estimatedWeightKg: 1.0,
      points: 0,
      rejectionReason: "Material was contaminated with food waste."
    },
    create: {
      id: "TXN002",
      userId: student.id,
      qrId: rejectedQr.id,
      status: "REJECTED",
      materialType: "PAPER",
      estimatedWeightKg: 1.0,
      points: 0,
      rejectionReason: "Material was contaminated with food waste."
    }
  });

  // Third QR/transaction pair: another approved drop-off (e-waste), so the
  // seeded balance ends up realistically positive rather than negative.
  const ewasteRate = rates.find((rate) => rate.materialType === "E_WASTE");
  const ewasteWeightKg = 2.0;
  const ewastePoints = Math.round(ewasteWeightKg * ewasteRate.pointsPerKg);

  const ewasteQr = await prisma.qRCode.upsert({
    where: { id: "QR003" },
    update: {
      nonce: "seed-nonce-qr003",
      signature: "seed-signature-qr003",
      payload: { materialType: "E_WASTE", estimatedWeightKg: ewasteWeightKg },
      status: "CLAIMED",
      expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      issuedBy: admin.id,
      claimedBy: student.id,
      claimedAt: new Date()
    },
    create: {
      id: "QR003",
      nonce: "seed-nonce-qr003",
      signature: "seed-signature-qr003",
      payload: { materialType: "E_WASTE", estimatedWeightKg: ewasteWeightKg },
      status: "CLAIMED",
      expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      issuedBy: admin.id,
      claimedBy: student.id,
      claimedAt: new Date()
    }
  });

  const ewasteTransaction = await prisma.recyclingTransaction.upsert({
    where: { id: "TXN003" },
    update: {
      userId: student.id,
      qrId: ewasteQr.id,
      status: "APPROVED",
      materialType: "E_WASTE",
      estimatedWeightKg: ewasteWeightKg,
      points: ewastePoints
    },
    create: {
      id: "TXN003",
      userId: student.id,
      qrId: ewasteQr.id,
      status: "APPROVED",
      materialType: "E_WASTE",
      estimatedWeightKg: ewasteWeightKg,
      points: ewastePoints
    }
  });

  await prisma.pointsEvent.upsert({
    where: { id: "PEV105" },
    update: {
      userId: student.id,
      recyclingTransactionId: ewasteTransaction.id,
      points: ewastePoints,
      eventType: "QR_RECYCLING_APPROVED",
      status: "SENT",
      approvedAt: new Date()
    },
    create: {
      id: "PEV105",
      userId: student.id,
      recyclingTransactionId: ewasteTransaction.id,
      points: ewastePoints,
      eventType: "QR_RECYCLING_APPROVED",
      status: "SENT",
      approvedAt: new Date()
    }
  });

  return transaction;
}

async function seedRewardRedemptions(student, rewards) {
  const [toteBag, bottle] = rewards;

  // Reserved: points deducted, awaiting pickup/completion.
  await prisma.rewardRedemption.upsert({
    where: { id: "RDM001" },
    update: { userId: student.id, rewardId: toteBag.id, pointsUsed: toteBag.pointsRequired, status: "RESERVED" },
    create: { id: "RDM001", userId: student.id, rewardId: toteBag.id, pointsUsed: toteBag.pointsRequired, status: "RESERVED" }
  });

  await prisma.pointsEvent.upsert({
    where: { id: "PEV102" },
    update: {
      userId: student.id,
      rewardRedemptionId: "RDM001",
      points: -toteBag.pointsRequired,
      eventType: "REWARD_RESERVED",
      status: "SENT",
      approvedAt: new Date()
    },
    create: {
      id: "PEV102",
      userId: student.id,
      rewardRedemptionId: "RDM001",
      points: -toteBag.pointsRequired,
      eventType: "REWARD_RESERVED",
      status: "SENT",
      approvedAt: new Date()
    }
  });

  // Reserved then cancelled: points refunded via a second event, per the
  // review's "reward cancelled gives refund positive points" design.
  await prisma.rewardRedemption.upsert({
    where: { id: "RDM002" },
    update: { userId: student.id, rewardId: bottle.id, pointsUsed: bottle.pointsRequired, status: "CANCELLED", remarks: "Out of stock at pickup." },
    create: { id: "RDM002", userId: student.id, rewardId: bottle.id, pointsUsed: bottle.pointsRequired, status: "CANCELLED", remarks: "Out of stock at pickup." }
  });

  await prisma.pointsEvent.upsert({
    where: { id: "PEV103" },
    update: {
      userId: student.id,
      rewardRedemptionId: "RDM002",
      points: -bottle.pointsRequired,
      eventType: "REWARD_RESERVED",
      status: "SENT",
      approvedAt: new Date()
    },
    create: {
      id: "PEV103",
      userId: student.id,
      rewardRedemptionId: "RDM002",
      points: -bottle.pointsRequired,
      eventType: "REWARD_RESERVED",
      status: "SENT",
      approvedAt: new Date()
    }
  });

  await prisma.pointsEvent.upsert({
    where: { id: "PEV104" },
    update: {
      userId: student.id,
      rewardRedemptionId: "RDM002",
      points: bottle.pointsRequired,
      eventType: "REWARD_CANCELLED",
      status: "SENT",
      approvedAt: new Date()
    },
    create: {
      id: "PEV104",
      userId: student.id,
      rewardRedemptionId: "RDM002",
      points: bottle.pointsRequired,
      eventType: "REWARD_CANCELLED",
      status: "SENT",
      approvedAt: new Date()
    }
  });
}

async function main() {
  const { admin, students } = await upsertUsers();
  const rates = await upsertRewardRates();
  const rewards = await upsertRewards();
  await seedQrRecyclingFlow(admin, students[0], rates);
  await seedRewardRedemptions(students[0], rewards);

  const balance = await prisma.pointsEvent.aggregate({
    where: { userId: students[0].id },
    _sum: { points: true }
  });
  console.log(`Seed complete. ${students[0].email} net points balance: ${balance._sum.points}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
