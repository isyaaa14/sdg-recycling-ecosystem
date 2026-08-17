import { jest, describe, it, expect, beforeEach } from "@jest/globals";

const mockDeactivateUser = jest.fn();
const mockReactivateUser = jest.fn();
const mockFindUserById = jest.fn();
const mockFindUnreadAdminNotifications = jest.fn();
const mockMarkAdminNotificationsRead = jest.fn();

jest.unstable_mockModule("../../repositories/userLifecycle.repository.js", () => ({
  deactivateUser: mockDeactivateUser,
  reactivateUser: mockReactivateUser,
  findUserById: mockFindUserById,
  findUnreadAdminNotifications: mockFindUnreadAdminNotifications,
  markAdminNotificationsRead: mockMarkAdminNotificationsRead
}));

const {
  deactivateStudent,
  listUnreadAdminNotifications,
  markNotificationsRead,
  reactivateStudent
} = await import("../../services/userLifecycle.service.js");

beforeEach(() => {
  jest.clearAllMocks();
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

describe("deactivateStudent", () => {
  it("throws 404 when the user does not exist", async () => {
    mockFindUserById.mockResolvedValue(null);

    await expect(deactivateStudent("USR999")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("does not allow an admin account to be deactivated", async () => {
    mockFindUserById.mockResolvedValue({ id: "ADM001", role: "ADMIN", isActive: true });

    await expect(deactivateStudent("ADM001")).rejects.toMatchObject({ statusCode: 400 });
    expect(mockDeactivateUser).not.toHaveBeenCalled();
  });

  it("deactivates an active student with the admin-provided reason", async () => {
    mockFindUserById.mockResolvedValue({ id: "USR002", role: "STUDENT", isActive: true });
    mockDeactivateUser.mockResolvedValue({ id: "USR002", isActive: false, deactivationReason: "Requested by user" });

    const result = await deactivateStudent("USR002", "Requested by user");

    expect(mockDeactivateUser).toHaveBeenCalledWith("USR002", "Requested by user");
    expect(result).toEqual({ id: "USR002", isActive: false, deactivationReason: "Requested by user" });
  });

  it("uses a clear default reason when none is supplied", async () => {
    mockFindUserById.mockResolvedValue({ id: "USR002", role: "STUDENT", isActive: true });
    mockDeactivateUser.mockResolvedValue({ id: "USR002", isActive: false });

    await deactivateStudent("USR002");

    expect(mockDeactivateUser).toHaveBeenCalledWith(
      "USR002",
      "Deactivated by an administrator upon user request."
    );
  });
});
