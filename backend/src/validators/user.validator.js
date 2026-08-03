import { z } from "zod";

export const updateMyProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional()
  })
  .refine((data) => data.name !== undefined, {
    message: "No profile fields provided."
  });
