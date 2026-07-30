import { z } from "zod";

export const createBadgeSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  tier: z.enum(["BRONZE", "SILVER", "GOLD"]),
  criteriaType: z.enum(["MISSIONS_COMPLETED", "QUIZZES_PASSED", "CONTENT_COMPLETED", "APPROVED_SUBMISSIONS"]),
  criteriaValue: z.number().int().positive()
});

export const updateBadgeSchema = createBadgeSchema.partial().extend({
  isActive: z.boolean().optional()
});
