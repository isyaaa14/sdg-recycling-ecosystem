import { jest, describe, it, expect, beforeEach } from "@jest/globals";

process.env.JWT_SECRET = "test-jwt-secret";

const mockCreateUser = jest.fn();
const mockFindUserByEmail = jest.fn();
jest.unstable_mockModule("../../repositories/user.repository.js", () => ({
  createUser: mockCreateUser,
  findUserByEmail: mockFindUserByEmail
}));

const mockCreateWithGeneratedId = jest.fn((model, prefix, createFn) => createFn(`${prefix}-TEST`));
jest.unstable_mockModule("../../utils/idGenerator.js", () => ({
  createWithGeneratedId: mockCreateWithGeneratedId
}));

const { register, login } = await import("../../services/auth.service.js");

const bcrypt = (await import("bcrypt")).default;

beforeEach(() => {
  jest.clearAllMocks();
  mockFindUserByEmail.mockResolvedValue(null);
  mockCreateUser.mockImplementation((data) => Promise.resolve({ ...data }));
});

describe("register", () => {
  it("succeeds for a student.uow.edu.my email and creates a STUDENT", async () => {
    const result = await register({
      name: "Student One",
      email: "student1@student.uow.edu.my",
      password: "Password123!"
    });

    expect(mockCreateUser).toHaveBeenCalledWith(expect.objectContaining({ role: "STUDENT" }));
    expect(result.user.email).toBe("student1@student.uow.edu.my");
    expect(result.token).toBeTruthy();
  });

  it("succeeds for a uow.edu.my (staff) email and still creates a STUDENT", async () => {
    const result = await register({
      name: "Staff One",
      email: "staff1@uow.edu.my",
      password: "Password123!"
    });

    expect(mockCreateUser).toHaveBeenCalledWith(expect.objectContaining({ role: "STUDENT" }));
    expect(result.user.email).toBe("staff1@uow.edu.my");
  });

  it("rejects a disallowed email domain", async () => {
    await expect(
      register({ name: "Someone", email: "someone@gmail.com", password: "Password123!" })
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it("rejects a prefix-spoofed domain", async () => {
    await expect(
      register({ name: "Someone", email: "someone@notstudent.uow.edu.my", password: "Password123!" })
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it("rejects a suffix-spoofed domain", async () => {
    await expect(
      register({ name: "Someone", email: "someone@student.uow.edu.my.evil.com", password: "Password123!" })
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(mockCreateUser).not.toHaveBeenCalled();
  });
});

describe("login", () => {
  async function mockActiveUser(overrides = {}) {
    const passwordHash = await bcrypt.hash("Password123!", 10);
    return {
      id: "USR001",
      name: "Student One",
      email: "student1@student.uow.edu.my",
      passwordHash,
      role: "STUDENT",
      isActive: true,
      ...overrides
    };
  }

  it("succeeds for an active user regardless of email domain (registration-only enforcement)", async () => {
    mockFindUserByEmail.mockResolvedValue(await mockActiveUser({ email: "admin@sdg.local" }));

    const result = await login({ email: "admin@sdg.local", password: "Password123!" });

    expect(result.token).toBeTruthy();
  });

  it("rejects login for a deactivated user with 403", async () => {
    mockFindUserByEmail.mockResolvedValue(await mockActiveUser({ isActive: false }));

    await expect(
      login({ email: "student1@student.uow.edu.my", password: "Password123!" })
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
