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
  createdById: z.string().min(1)
});
