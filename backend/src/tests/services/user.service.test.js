import { jest, describe, it, expect, beforeEach } from "@jest/globals";

process.env.JWT_SECRET = "test-jwt-secret";

const mockCreateUser = jest.fn();
const mockFindUserByEmail = jest.fn();
const mockUpdateUser = jest.fn();
jest.unstable_mockModule("../../repositories/user.repository.js", () => ({
  createUser: mockCreateUser,
  findUserByEmail: mockFindUserByEmail,
  updateUser: mockUpdateUser
}));

const mockCreateWithGeneratedId = jest.fn((model, prefix, createFn) => createFn(`${prefix}-TEST`));
jest.unstable_mockModule("../../utils/idGenerator.js", () => ({
  createWithGeneratedId: mockCreateWithGeneratedId
}));

const { updateMyProfile } = await import("../../services/user.service.js");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("updateMyProfile", () => {
  it("updates the user's name on the happy path", async () => {
    mockUpdateUser.mockResolvedValue({ id: "USR001", name: "New Name", email: "a@b.com", passwordHash: "hash" });

    const result = await updateMyProfile("USR001", { name: "New Name" });

    expect(mockUpdateUser).toHaveBeenCalledWith("USR001", { name: "New Name" });
    expect(result.passwordHash).toBeUndefined();
    expect(result.name).toBe("New Name");
  });

  it("rejects an empty payload", async () => {
    await expect(updateMyProfile("USR001", {})).rejects.toMatchObject({ statusCode: 400 });

    expect(mockUpdateUser).not.toHaveBeenCalled();
  });
});
