import { z } from "zod";

export const reviewSubmissionSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().optional()
});
