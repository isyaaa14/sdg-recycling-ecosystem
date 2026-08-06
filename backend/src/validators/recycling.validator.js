import { z } from "zod";

export const createRecyclingSubmissionSchema = z.object({
  materialType: z.string().trim().min(1),
  quantity: z.number().positive(),
  proofImageUrl: z.string().url().optional(),
  uploadId: z.string().trim().min(1).optional()
});

export const reviewRecyclingSubmissionSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().trim().max(1000).optional()
});

export const updatePointRatesSchema = z.object({
  rates: z.array(
    z.object({
      material: z.string().trim().min(1),
      ratePerKg: z.number().int().min(0).max(500)
    })
  ).min(1)
});

export const issueRecyclingQrSchema = z.object({
  materialType: z.string().trim().min(1),
  estimatedWeightKg: z.coerce.number().positive(),
  expiresInMinutes: z.coerce.number().int().min(1).max(1440).optional()
});

export const claimRecyclingQrSchema = z.object({
  payload: z.object({
    qrId: z.string().trim().min(1),
    nonce: z.string().trim().min(1),
    type: z.literal("recycling-deposit"),
    materialType: z.string().trim().min(1),
    estimatedWeightKg: z.coerce.number().positive(),
    expiresAt: z.string().datetime()
  }),
  signature: z.string().trim().regex(/^[a-f0-9]{64}$/i)
});

export const recyclingSubmissionSourceSchema = z.enum(["MANUAL", "QR"]);
