import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";

const mockCreatePointsEvent = jest.fn();
const mockFindPointsEventByUserAndMission = jest.fn();
const mockFindPointsEventByRecyclingSubmission = jest.fn();
const mockFindPointsEventByRedemption = jest.fn();
const mockFindPointsEventByRedemptionRefund = jest.fn();
const mockFindPointsEventsByUser = jest.fn();
const mockSumPointsForUser = jest.fn();
const mockSumLifetimePointsForUser = jest.fn();
const mockFindAllPointsEvents = jest.fn();
const mockUpdatePointsEventStatus = jest.fn();

jest.unstable_mockModule("../../repositories/points.repository.js", () => ({
  createPointsEvent: mockCreatePointsEvent,
  findPointsEventByUserAndMission: mockFindPointsEventByUserAndMission,
  findPointsEventByRecyclingSubmission: mockFindPointsEventByRecyclingSubmission,
  findPointsEventByRedemption: mockFindPointsEventByRedemption,
  findPointsEventByRedemptionRefund: mockFindPointsEventByRedemptionRefund,
  findPointsEventsByUser: mockFindPointsEventsByUser,
  sumPointsForUser: mockSumPointsForUser,
  sumLifetimePointsForUser: mockSumLifetimePointsForUser,
  findAllPointsEvents: mockFindAllPointsEvents,
  updatePointsEventStatus: mockUpdatePointsEventStatus
}));

const mockCreateWithGeneratedId = jest.fn((model, prefix, createFn) => createFn(`${prefix}-TEST`));
jest.unstable_mockModule("../../utils/idGenerator.js", () => ({
  createWithGeneratedId: mockCreateWithGeneratedId
}));

const { createAdminAdjustment, createPointsEventForMissionCompletion, listMyPoints } = await import(
  "../../services/points.service.js"
);

beforeEach(() => {
  jest.clearAllMocks();
});

describe("createPointsEventForMissionCompletion", () => {
  it("creates a new SENT event when none exists for that user/mission (no ledger configured)", async () => {
    mockFindPointsEventByUserAndMission.mockResolvedValue(null);
    mockCreatePointsEvent.mockResolvedValue({ id: "PEV-TEST", status: "SENT", userId: "USR001", missionId: "MSN001" });

    const result = await createPointsEventForMissionCompletion({
      userId: "USR001",
      missionId: "MSN001",
      submissionId: "SUB001",
      points: 20
    });

    expect(mockCreatePointsEvent).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "USR001", missionId: "MSN001", eventType: "MISSION_COMPLETED", status: "SENT" })
    );
    expect(result.status).toBe("SENT");
    expect(mockUpdatePointsEventStatus).not.toHaveBeenCalled();
  });

  it("returns the existing SENT event without creating a duplicate", async () => {
    mockFindPointsEventByUserAndMission.mockResolvedValue({ id: "PEV-OLD", status: "SENT" });

    const result = await createPointsEventForMissionCompletion({
      userId: "USR001",
      missionId: "MSN001",
      submissionId: "SUB001",
      points: 20
    });

    expect(result).toEqual({ id: "PEV-OLD", status: "SENT" });
    expect(mockCreatePointsEvent).not.toHaveBeenCalled();
  });

  it("re-dispatches an existing PENDING event instead of returning it as-is", async () => {
    mockFindPointsEventByUserAndMission.mockResolvedValue({ id: "PEV-OLD", status: "PENDING" });
    mockUpdatePointsEventStatus.mockResolvedValue({ id: "PEV-OLD", status: "SENT" });

    await createPointsEventForMissionCompletion({
      userId: "USR001",
      missionId: "MSN001",
      submissionId: "SUB001",
      points: 20
    });

    expect(mockUpdatePointsEventStatus).toHaveBeenCalledWith("PEV-OLD", expect.objectContaining({ status: "SENT" }));
    expect(mockCreatePointsEvent).not.toHaveBeenCalled();
  });
});

describe("createAdminAdjustment", () => {
  it("creates an ADMIN_ADJUSTMENT event", async () => {
    mockCreatePointsEvent.mockResolvedValue({ id: "PEV-TEST", status: "SENT", eventType: "ADMIN_ADJUSTMENT" });

    const result = await createAdminAdjustment({ userId: "USR001", points: 50 });

    expect(mockCreatePointsEvent).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "USR001", points: 50, eventType: "ADMIN_ADJUSTMENT", status: "SENT" })
    );
    expect(result.eventType).toBe("ADMIN_ADJUSTMENT");
  });
});

describe("listMyPoints", () => {
  it("aggregates events, total, and lifetimeTotal for the user via Promise.all", async () => {
    mockFindPointsEventsByUser.mockResolvedValue([{ id: "PEV1" }]);
    mockSumPointsForUser.mockResolvedValue(120);
    mockSumLifetimePointsForUser.mockResolvedValue(500);

    const result = await listMyPoints("USR001");

    expect(mockFindPointsEventsByUser).toHaveBeenCalledWith("USR001");
    expect(mockSumPointsForUser).toHaveBeenCalledWith("USR001");
    expect(mockSumLifetimePointsForUser).toHaveBeenCalledWith("USR001");
    expect(result).toEqual({ events: [{ id: "PEV1" }], total: 120, lifetimeTotal: 500 });
  });
});

describe("dispatchPointsEvent with an external points ledger configured", () => {
  let createAdminAdjustmentWithLedger;
  let mockCreatePointsEventLedger;
  let mockUpdatePointsEventStatusLedger;
  let originalFetch;

  beforeEach(async () => {
    jest.resetModules();

    mockCreatePointsEventLedger = jest.fn((data) => Promise.resolve({ id: "PEV-LEDGER", ...data }));
    mockUpdatePointsEventStatusLedger = jest.fn((id, data) => Promise.resolve({ id, ...data }));

    jest.unstable_mockModule("../../repositories/points.repository.js", () => ({
      createPointsEvent: mockCreatePointsEventLedger,
      findPointsEventByUserAndMission: jest.fn(),
      findPointsEventByRecyclingSubmission: jest.fn(),
      findPointsEventByRedemption: jest.fn(),
      findPointsEventByRedemptionRefund: jest.fn(),
      findPointsEventsByUser: jest.fn(),
      sumPointsForUser: jest.fn(),
      sumLifetimePointsForUser: jest.fn(),
      findAllPointsEvents: jest.fn(),
      updatePointsEventStatus: mockUpdatePointsEventStatusLedger
    }));
    jest.unstable_mockModule("../../utils/idGenerator.js", () => ({
      createWithGeneratedId: jest.fn((model, prefix, createFn) => createFn(`${prefix}-LEDGER`))
    }));
    jest.unstable_mockModule("../../utils/config.js", () => ({
      config: { pointsLedgerUrl: "http://fake-ledger.test", pointsLedgerTimeoutMs: 1000 }
    }));

    ({ createAdminAdjustment: createAdminAdjustmentWithLedger } = await import("../../services/points.service.js"));

    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("flips status to SENT after a successful ledger POST", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    await createAdminAdjustmentWithLedger({ userId: "USR001", points: 10 });

    expect(mockUpdatePointsEventStatusLedger).toHaveBeenCalledWith(
      "PEV-LEDGER",
      expect.objectContaining({ status: "SENT" })
    );
  });

  it("marks status FAILED when the ledger responds non-ok", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });

    await createAdminAdjustmentWithLedger({ userId: "USR001", points: 10 });

    expect(mockUpdatePointsEventStatusLedger).toHaveBeenCalledWith(
      "PEV-LEDGER",
      expect.objectContaining({ status: "FAILED" })
    );
  });

  it("marks status FAILED when the fetch call itself rejects (network error)", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("network down"));

    await createAdminAdjustmentWithLedger({ userId: "USR001", points: 10 });

    expect(mockUpdatePointsEventStatusLedger).toHaveBeenCalledWith(
      "PEV-LEDGER",
      expect.objectContaining({ status: "FAILED", errorMessage: "network down" })
    );
  });
});
