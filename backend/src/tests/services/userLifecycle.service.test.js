import { jest, describe, it, expect, beforeEach } from "@jest/globals";

const mockFindInactiveStudentCandidates = jest.fn();
const mockDeactivateUser = jest.fn();
const mockReactivateUser = jest.fn();
const mockFindUserById = jest.fn();
const mockCreateAdminNotification = jest.fn();
const mockFindUnreadAdminNotifications = jest.fn();
const mockMarkAdminNotificationsRead = jest.fn();
const mockRunInTransaction = jest.fn((callback) => callback({}));

jest.unstable_mockModule("../../repositories/userLifecycle.repository.js", () => ({
  findInactiveStudentCandidates: mockFindInactiveStudentCandidates,
  deactivateUser: mockDeactivateUser,
  reactivateUser: mockReactivateUser,
  findUserById: mockFindUserById,
  createAdminNotification: mockCreateAdminNotification,
  findUnreadAdminNotifications: mockFindUnreadAdminNotifications,
  markAdminNotificationsRead: mockMarkAdminNotificationsRead,
  runInTransaction: mockRunInTransaction
}));

const mockCreateWithGeneratedId = jest.fn((model, prefix, createFn) => createFn(`${prefix}-TEST`));
jest.unstable_mockModule("../../utils/idGenerator.js", () => ({
  createWithGeneratedId: mockCreateWithGeneratedId
}));

const {
  sweepInactiveStudents,
  listUnreadAdminNotifications,
  markNotificationsRead,
  reactivateStudent
} = await import("../../services/userLifecycle.service.js");

beforeEach(() => {
  jest.clearAllMocks();
  mockRunInTransaction.mockImplementation((callback) => callback({}));
});

describe("sweepInactiveStudents", () => {
  it("deactivates each stale candidate and writes exactly one notification per user", async () => {
    mockFindInactiveStudentCandidates.mockResolvedValue([
      { id: "USR002", name: "Student One", email: "student1@student.uow.edu.my" },
      { id: "USR003", name: "Student Two", email: "student2@student.uow.edu.my" }
    ]);

    const result = await sweepInactiveStudents();

    expect(mockDeactivateUser).toHaveBeenCalledTimes(2);
    expect(mockCreateAdminNotification).toHaveBeenCalledTimes(2);
    expect(mockCreateAdminNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: "USER_DEACTIVATED", targetUserId: "USR002" }),
      expect.anything()
    );
    expect(result).toEqual({ deactivatedCount: 2, deactivatedUserIds: ["USR002", "USR003"] });
  });

  it("is a no-op when there are no candidates", async () => {
    mockFindInactiveStudentCandidates.mockResolvedValue([]);

    const result = await sweepInactiveStudents();

    expect(mockDeactivateUser).not.toHaveBeenCalled();
    expect(mockCreateAdminNotification).not.toHaveBeenCalled();
    expect(result).toEqual({ deactivatedCount: 0, deactivatedUserIds: [] });
  });
});

describe("listUnreadAdminNotifications", () => {
  it("returns whatever the repository returns, unmodified", async () => {
    const notifications = [{ id: "NOT001" }];
    mockFindUnreadAdminNotifications.mockResolvedValue(notifications);

    const result = await listUnreadAdminNotifications();

    expect(result).toBe(notifications);
  });
});

describe("markNotificationsRead", () => {
  it("throws 400 for an empty array", async () => {
    await expect(markNotificationsRead([], "USR001")).rejects.toMatchObject({ statusCode: 400 });
    expect(mockMarkAdminNotificationsRead).not.toHaveBeenCalled();
  });

  it("throws 400 for a non-array", async () => {
    await expect(markNotificationsRead(undefined, "USR001")).rejects.toMatchObject({ statusCode: 400 });
  });

  it("calls the repository with the right args on success", async () => {
    mockMarkAdminNotificationsRead.mockResolvedValue({ count: 1 });

    await markNotificationsRead(["NOT001"], "USR001");

    expect(mockMarkAdminNotificationsRead).toHaveBeenCalledWith(["NOT001"], "USR001");
  });
});

describe("reactivateStudent", () => {
  it("throws 404 when the user does not exist", async () => {
    mockFindUserById.mockResolvedValue(null);

    await expect(reactivateStudent("USR999")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("throws 400 for a non-STUDENT user", async () => {
    mockFindUserById.mockResolvedValue({ id: "USR001", role: "ADMIN", isActive: false });

    await expect(reactivateStudent("USR001")).rejects.toMatchObject({ statusCode: 400 });
    expect(mockReactivateUser).not.toHaveBeenCalled();
  });

  it("throws 400 when the student is already active", async () => {
    mockFindUserById.mockResolvedValue({ id: "USR002", role: "STUDENT", isActive: true });

    await expect(reactivateStudent("USR002")).rejects.toMatchObject({ statusCode: 400 });
    expect(mockReactivateUser).not.toHaveBeenCalled();
  });

  it("reactivates a deactivated student", async () => {
    mockFindUserById.mockResolvedValue({ id: "USR002", role: "STUDENT", isActive: false });
    mockReactivateUser.mockResolvedValue({ id: "USR002", isActive: true });

    const result = await reactivateStudent("USR002");

    expect(mockReactivateUser).toHaveBeenCalledWith("USR002");
    expect(result).toEqual({ id: "USR002", isActive: true });
  });
});
