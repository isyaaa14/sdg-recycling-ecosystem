import { z } from "zod";

export const contentTagValues = [
  "plastic",
  "paper",
  "ewaste",
  "food-waste",
  "sorting",
  "cleanliness",
  "safety",
  "general"
];

const optionalUrlString = z.union([z.string().url(), z.literal("")]).optional();

const contentBlockSchema = z.object({
  type: z.enum(["paragraph", "heading", "image"]),
  text: z.string().optional(),
  url: optionalUrlString,
  alt: z.string().optional()
});

export const createContentSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  summary: z.string().min(1).optional(),
  imageUrl: optionalUrlString,
  estimatedReadMinutes: z.number().int().positive().optional(),
  contentBlocks: z.array(contentBlockSchema).optional(),
  tags: z.array(z.enum(contentTagValues)).min(1),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"])
});

export const updateContentSchema = createContentSchema.partial();
