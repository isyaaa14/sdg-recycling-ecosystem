import { z } from "zod";

export const createMissionSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  type: z.enum(["QUANTITY_BASED", "STREAK_BASED", "TIME_LIMITED"]),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  submissionCap: z.number().int().positive(),
  points: z.number().int().positive(),
  autoApprove: z.boolean(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
  isActive: z.boolean().optional()
});

export const updateMissionSchema = createMissionSchema.partial();

export const submitMissionSchema = z.object({
  proofText: z.string().min(1).optional(),
  proofImageUrl: z.string().url().optional(),
  quantity: z.number().int().positive().optional(),
  uploadId: z.string().min(1).optional()
});
