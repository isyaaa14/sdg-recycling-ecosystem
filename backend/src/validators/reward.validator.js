import { z } from "zod";

const optionalUrl = z.union([z.string().url(), z.literal("")]).optional();

export const createRewardSchema = z.object({
  name: z.string().trim().min(1),
  pointsRequired: z.number().int().positive(),
  stock: z.number().int().min(0).default(0),
  imageUrl: optionalUrl,
  category: z.string().trim().min(1).optional(),
  expiresAt: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
  tier: z.enum(["small", "medium", "large"]).default("small")
});

export const updateRewardSchema = createRewardSchema.partial();

export const redeemRewardSchema = z.object({
  quantity: z.number().int().positive().max(10).default(1)
});

export const cancelRedemptionSchema = z.object({
  reason: z.string().trim().min(1).max(500).optional()
});
