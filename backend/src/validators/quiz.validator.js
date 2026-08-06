import { z } from "zod";

export const createQuizSchema = z.object({
  contentId: z.string().min(1),
  title: z.string().min(1),
  passingScore: z.number().int().min(1).max(10).optional()
});

export const updateQuizSchema = z.object({
  title: z.string().min(1).optional(),
  passingScore: z.number().int().min(1).max(10).optional()
});

export const addQuestionSchema = z
  .object({
    questionText: z.string().min(1),
    options: z.array(z.string().min(1)).min(2),
    correctAnswer: z.string().min(1),
    points: z.literal(1).optional()
  })
  .refine((data) => data.options.includes(data.correctAnswer), {
    message: "correctAnswer must be one of the provided options.",
    path: ["correctAnswer"]
  });

export const updateQuestionSchema = z
  .object({
    questionText: z.string().min(1).optional(),
    options: z.array(z.string().min(1)).min(2).optional(),
    correctAnswer: z.string().min(1).optional(),
    points: z.literal(1).optional()
  })
  .refine((data) => !data.options || !data.correctAnswer || data.options.includes(data.correctAnswer), {
    message: "correctAnswer must be one of the provided options.",
    path: ["correctAnswer"]
  });

export const submitAttemptSchema = z.object({
  answers: z.record(z.string(), z.string()),
  timeSpentSeconds: z.number().int().nonnegative().optional()
});
