import { z } from "zod";

export const createContentSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  tags: z.array(z.string().min(1)),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"])
});

export const updateContentSchema = createContentSchema.partial();
