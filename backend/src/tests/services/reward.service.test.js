import { jest, describe, it, expect, beforeEach } from "@jest/globals";

const fakeTx = { __tx: true };

const mockCreateRedemption = jest.fn();
const mockCreateRewardRecord = jest.fn();
const mockCompleteRedemptionIfReservedAndUnexpired = jest.fn();
const mockDecrementRewardStockIfAvailable = jest.fn();
const mockFindRedemptionCooldown = jest.fn();
const mockFindRedemptionById = jest.fn();
const mockFindExpiredReservedRedemptions = jest.fn();
const mockFindRedemptions = jest.fn();
const mockFindRewardById = jest.fn();
const mockFindRewards = jest.fn();
const mockIncrementRewardStock = jest.fn();
const mockLockUserForUpdate = jest.fn();
const mockRunInTransaction = jest.fn((callback) => callback(fakeTx));
const mockUpdateRedemptionIfStatus = jest.fn();
const mockUpdateRewardRecord = jest.fn();
const mockUpsertRedemptionCooldown = jest.fn();

jest.unstable_mockModule("../../repositories/reward.repository.js", () => ({
  createRedemption: mockCreateRedemption,
  createReward: mockCreateRewardRecord,
  completeRedemptionIfReservedAndUnexpired: mockCompleteRedemptionIfReservedAndUnexpired,
  decrementRewardStockIfAvailable: mockDecrementRewardStockIfAvailable,
  findRedemptionCooldown: mockFindRedemptionCooldown,
  findRedemptionById: mockFindRedemptionById,
  findExpiredReservedRedemptions: mockFindExpiredReservedRedemptions,
  findRedemptions: mockFindRedemptions,
  findRewardById: mockFindRewardById,
  findRewards: mockFindRewards,
  incrementRewardStock: mockIncrementRewardStock,
  lockUserForUpdate: mockLockUserForUpdate,
  runInTransaction: mockRunInTransaction,
  updateRedemptionIfStatus: mockUpdateRedemptionIfStatus,
  updateReward: mockUpdateRewardRecord,
  upsertRedemptionCooldown: mockUpsertRedemptionCooldown
}));

const mockCreatePointsEventForRewardRedemption = jest.fn();
const mockCreatePointsEventForRewardRefund = jest.fn();
jest.unstable_mockModule("../../services/points.service.js", () => ({
  createPointsEventForRewardRedemption: mockCreatePointsEventForRewardRedemption,
  createPointsEventForRewardRefund: mockCreatePointsEventForRewardRefund
}));

const mockSumPointsForUser = jest.fn();
jest.unstable_mockModule("../../repositories/points.repository.js", () => ({
  sumPointsForUser: mockSumPointsForUser
}));

const mockCreateWithGeneratedId = jest.fn((model, prefix, createFn) => createFn(`${prefix}-TEST`));
jest.unstable_mockModule("../../utils/idGenerator.js", () => ({
  createWithGeneratedId: mockCreateWithGeneratedId
}));

class MockUploadServiceError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}
const mockCreateRewardImageReadUrl = jest.fn();
const mockUploadRewardImageFile = jest.fn();
jest.unstable_mockModule("../../services/upload.service.js", () => ({
  createRewardImageReadUrl: mockCreateRewardImageReadUrl,
  uploadRewardImage: mockUploadRewardImageFile,
  UploadServiceError: MockUploadServiceError
}));

const { cancelRedemption, completeRedemption, createReward, deactivateReward, expireOverdueRedemptions, redeemReward, updateReward } =
  await import("../../services/reward.service.js");

const reward = {
  id: "RWD001",
  name: "Eco Kit",
  pointsRequired: 100,
  stock: 5,
  isActive: true,
  expiresAt: null,
  tier: "small",
  imageUpload: null
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRunInTransaction.mockImplementation((callback) => callback(fakeTx));
  mockFindRedemptionCooldown.mockResolvedValue(null);
});

describe("redeemReward", () => {
  it("acquires the lock, re-checks balance under it, then decrements stock, in that order", async () => {
    const callOrder = [];
    mockFindRewardById.mockResolvedValue(reward);
    mockLockUserForUpdate.mockImplementation(async () => {
      callOrder.push("lockUserForUpdate");
    });
    mockSumPointsForUser
      .mockImplementationOnce(async () => {
        callOrder.push("sumPointsForUser:pre");
        return 1000;
      })
      .mockImplementation(async () => {
        callOrder.push("sumPointsForUser:locked");
        return 1000;
      });
    mockDecrementRewardStockIfAvailable.mockImplementation(async () => {
      callOrder.push("decrementRewardStockIfAvailable");
      return { count: 1 };
    });
    mockCreateRedemption.mockResolvedValue({ id: "RDM001" });
    mockCreatePointsEventForRewardRedemption.mockResolvedValue({ id: "PEV001" });
    mockFindRedemptionById.mockResolvedValue({ id: "RDM001", userId: "USR001" });

    await redeemReward("RWD001", { quantity: 1 }, "USR001");

    expect(callOrder).toEqual([
      "sumPointsForUser:pre",
      "lockUserForUpdate",
      "sumPointsForUser:locked",
      "decrementRewardStockIfAvailable"
    ]);
  });

  it("rejects when the locked balance recheck finds the balance already spent by a concurrent redemption", async () => {
    mockFindRewardById.mockResolvedValue(reward);
    mockLockUserForUpdate.mockResolvedValue(undefined);
    mockSumPointsForUser.mockResolvedValueOnce(100).mockResolvedValueOnce(0);

    await expect(redeemReward("RWD001", { quantity: 1 }, "USR001")).rejects.toMatchObject({ statusCode: 400 });

    expect(mockDecrementRewardStockIfAvailable).not.toHaveBeenCalled();
    expect(mockCreateRedemption).not.toHaveBeenCalled();
    expect(mockCreatePointsEventForRewardRedemption).not.toHaveBeenCalled();
  });

  it("never opens a transaction when the pre-check balance is already insufficient", async () => {
    mockFindRewardById.mockResolvedValue(reward);
    mockSumPointsForUser.mockResolvedValue(0);

    await expect(redeemReward("RWD001", { quantity: 1 }, "USR001")).rejects.toMatchObject({ statusCode: 400 });

    expect(mockRunInTransaction).not.toHaveBeenCalled();
  });

  it("rejects with 409 when stock runs out inside the transaction", async () => {
    mockFindRewardById.mockResolvedValue(reward);
    mockLockUserForUpdate.mockResolvedValue(undefined);
    mockSumPointsForUser.mockResolvedValue(1000);
    mockDecrementRewardStockIfAvailable.mockResolvedValue({ count: 0 });

    await expect(redeemReward("RWD001", { quantity: 1 }, "USR001")).rejects.toMatchObject({ statusCode: 409 });

    expect(mockCreateRedemption).not.toHaveBeenCalled();
    expect(mockCreatePointsEventForRewardRedemption).not.toHaveBeenCalled();
  });

  it("threads the same tx through every write in the transaction", async () => {
    mockFindRewardById.mockResolvedValue(reward);
    mockLockUserForUpdate.mockResolvedValue(undefined);
    mockSumPointsForUser.mockResolvedValue(1000);
    mockDecrementRewardStockIfAvailable.mockResolvedValue({ count: 1 });
    mockCreateRedemption.mockResolvedValue({ id: "RDM001" });
    mockUpsertRedemptionCooldown.mockResolvedValue(undefined);
    mockCreatePointsEventForRewardRedemption.mockResolvedValue({ id: "PEV001" });
    mockFindRedemptionById.mockResolvedValue({ id: "RDM001", userId: "USR001" });

    await redeemReward("RWD001", { quantity: 1 }, "USR001");

    expect(mockDecrementRewardStockIfAvailable).toHaveBeenCalledWith("RWD001", 1, fakeTx);
    expect(mockCreateRedemption).toHaveBeenCalledWith(expect.objectContaining({ userId: "USR001" }), fakeTx);
    expect(mockUpsertRedemptionCooldown).toHaveBeenCalledWith(
      expect.anything(),
      "USR001",
      "RWD001",
      expect.anything(),
      1,
      fakeTx
    );
    expect(mockCreatePointsEventForRewardRedemption).toHaveBeenCalledWith(
      expect.objectContaining({ client: fakeTx })
    );
  });

  it("sets the collection deadline to three days after reservation", async () => {
    mockFindRewardById.mockResolvedValue(reward);
    mockLockUserForUpdate.mockResolvedValue(undefined);
    mockSumPointsForUser.mockResolvedValue(1000);
    mockDecrementRewardStockIfAvailable.mockResolvedValue({ count: 1 });
    mockCreateRedemption.mockResolvedValue({ id: "RDM001" });
    mockCreatePointsEventForRewardRedemption.mockResolvedValue({ id: "PEV001" });
    mockFindRedemptionById.mockResolvedValue({ id: "RDM001", userId: "USR001" });

    await redeemReward("RWD001", { quantity: 1 }, "USR001");

    const reservation = mockCreateRedemption.mock.calls[0][0];
    expect(reservation.expiresAt.getTime() - reservation.reservedAt.getTime()).toBe(3 * 24 * 60 * 60 * 1000);
  });
});

describe("completeRedemption", () => {
  it("only completes a RESERVED redemption", async () => {
    mockCompleteRedemptionIfReservedAndUnexpired.mockResolvedValue({ count: 0 });

    await expect(completeRedemption("RDM001", "ADM001")).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe("expireOverdueRedemptions", () => {
  it("cancels overdue reservations and restores stock and points", async () => {
    const now = new Date("2026-08-17T12:00:00.000Z");
    mockFindExpiredReservedRedemptions.mockResolvedValue([
      { id: "RDM001", userId: "USR001", rewardId: "RWD001", quantity: 2, pointsSpent: 200 }
    ]);
    mockUpdateRedemptionIfStatus.mockResolvedValue({ count: 1 });
    mockIncrementRewardStock.mockResolvedValue(undefined);
    mockCreatePointsEventForRewardRefund.mockResolvedValue({ id: "PEV002" });

    const result = await expireOverdueRedemptions(now);

    expect(mockFindExpiredReservedRedemptions).toHaveBeenCalledWith(now);
    expect(mockUpdateRedemptionIfStatus).toHaveBeenCalledWith(
      "RDM001",
      "RESERVED",
      expect.objectContaining({ status: "CANCELLED", cancelledAt: now }),
      fakeTx
    );
    expect(mockIncrementRewardStock).toHaveBeenCalledWith("RWD001", 2, fakeTx);
    expect(mockCreatePointsEventForRewardRefund).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "USR001", redemptionId: "RDM001", points: 200, client: fakeTx })
    );
    expect(result).toEqual({ cancelledCount: 1, cancelledRedemptionIds: ["RDM001"] });
  });

  it("does not restore stock or refund twice when another process already handled it", async () => {
    mockFindExpiredReservedRedemptions.mockResolvedValue([
      { id: "RDM001", userId: "USR001", rewardId: "RWD001", quantity: 1, pointsSpent: 100 }
    ]);
    mockUpdateRedemptionIfStatus.mockResolvedValue({ count: 0 });

    const result = await expireOverdueRedemptions();

    expect(mockIncrementRewardStock).not.toHaveBeenCalled();
    expect(mockCreatePointsEventForRewardRefund).not.toHaveBeenCalled();
    expect(result.cancelledCount).toBe(0);
  });
});

describe("cancelRedemption", () => {
  it("refunds points and restores stock inside one transaction on the happy path", async () => {
    mockFindRedemptionById.mockResolvedValue({
      id: "RDM001",
      userId: "USR001",
      rewardId: "RWD001",
      quantity: 1,
      pointsSpent: 100,
      status: "RESERVED"
    });
    mockUpdateRedemptionIfStatus.mockResolvedValue({ count: 1 });
    mockIncrementRewardStock.mockResolvedValue(undefined);
    mockCreatePointsEventForRewardRefund.mockResolvedValue({ id: "PEV002" });

    await cancelRedemption("RDM001", {}, { id: "USR001", role: "STUDENT" });

    expect(mockIncrementRewardStock).toHaveBeenCalledWith("RWD001", 1, fakeTx);
    expect(mockCreatePointsEventForRewardRefund).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "USR001", redemptionId: "RDM001", points: 100, client: fakeTx })
    );
  });

  it("rejects a non-owner, non-admin caller before opening a transaction", async () => {
    mockFindRedemptionById.mockResolvedValue({ id: "RDM001", userId: "USR001", status: "RESERVED" });

    await expect(cancelRedemption("RDM001", {}, { id: "OTHER_USER", role: "STUDENT" })).rejects.toMatchObject({
      statusCode: 403
    });

    expect(mockRunInTransaction).not.toHaveBeenCalled();
  });
});

describe("createReward / updateReward / deactivateReward", () => {
  it("createReward creates a reward on the happy path", async () => {
    mockCreateRewardRecord.mockResolvedValue({ ...reward, id: "RWD-TEST" });

    const result = await createReward({ name: "Eco Kit", pointsRequired: 100 });

    expect(mockCreateRewardRecord).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Eco Kit", pointsRequired: 100 }),
      expect.anything()
    );
    expect(result.name).toBe("Eco Kit");
  });

  it("updateReward updates a reward on the happy path", async () => {
    mockFindRewardById.mockResolvedValue(reward);
    mockUpdateRewardRecord.mockResolvedValue({ ...reward, name: "New Name" });

    const result = await updateReward("RWD001", { name: "New Name" });

    expect(result.name).toBe("New Name");
  });

  it("deactivateReward deactivates a reward on the happy path", async () => {
    mockFindRewardById.mockResolvedValue(reward);
    mockUpdateRewardRecord.mockResolvedValue({ ...reward, isActive: false });

    const result = await deactivateReward("RWD001");

    expect(mockUpdateRewardRecord).toHaveBeenCalledWith("RWD001", { isActive: false }, expect.anything());
    expect(result.isActive).toBe(false);
  });
});
