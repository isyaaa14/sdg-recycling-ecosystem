import { describe, it, expect } from "@jest/globals";
import { extractEmailDomain, isAllowedRegistrationEmailDomain } from "../../utils/emailDomain.js";

describe("extractEmailDomain", () => {
  it("returns the substring after the final '@', lowercased", () => {
    expect(extractEmailDomain("a@b@c.com")).toBe("c.com");
    expect(extractEmailDomain("Test@STUDENT.UOW.EDU.MY")).toBe("student.uow.edu.my");
  });

  it("returns an empty string when there is no '@' or the email is falsy", () => {
    expect(extractEmailDomain("nodomain")).toBe("");
    expect(extractEmailDomain("")).toBe("");
  });
});

describe("isAllowedRegistrationEmailDomain", () => {
  it("allows the student subdomain", () => {
    expect(isAllowedRegistrationEmailDomain("a@student.uow.edu.my")).toBe(true);
  });

  it("allows the staff domain", () => {
    expect(isAllowedRegistrationEmailDomain("a@uow.edu.my")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isAllowedRegistrationEmailDomain("a@STUDENT.UOW.EDU.MY")).toBe(true);
  });

  it("rejects a prefix-spoofed domain", () => {
    expect(isAllowedRegistrationEmailDomain("a@notstudent.uow.edu.my")).toBe(false);
  });

  it("rejects a suffix-spoofed domain", () => {
    expect(isAllowedRegistrationEmailDomain("a@student.uow.edu.my.evil.com")).toBe(false);
  });

  it("rejects unrelated domains", () => {
    expect(isAllowedRegistrationEmailDomain("a@gmail.com")).toBe(false);
  });
});
