import { z } from "zod";
import { isAllowedRegistrationEmailDomain } from "../utils/emailDomain.js";

export const registerSchema = z
  .object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8)
  })
  .refine((data) => isAllowedRegistrationEmailDomain(data.email), {
    message: "Registration is restricted to student.uow.edu.my or uow.edu.my email addresses.",
    path: ["email"]
  });

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});
