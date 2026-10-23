import { z } from "zod";

export const createWorkOrderSchema = z.object({
  propertyId: z.string().min(1, "Property ID is required"),
  unitId: z.string().optional().nullable(),
  buildingId: z.string().optional().nullable(),
  isSharedArea: z.boolean().default(false),
  sharedAreaIdentifier: z.string().optional(),
  category: z.enum([
    "plumbing",
    "electrical",
    "hvac",
    "appliances",
    "fixtures",
    "structural",
    "cleaning",
    "shared_area",
    "other",
  ]),
  title: z.string().min(3, "Title must be at least 3 characters").max(120).trim(),
  description: z.string().min(10, "Description must be at least 10 characters").trim(),
  priority: z.enum(["low", "normal", "high", "emergency"]).default("normal"),
  accessPreferences: z.string().optional(),
  preferredAccessWindows: z
    .array(
      z.object({
        start: z.string().datetime().or(z.date()),
        end: z.string().datetime().or(z.date()),
        note: z.string().optional(),
      }),
    )
    .optional()
    .default([]),
});

export const completionReviewSchema = z.object({
  accepted: z.boolean({ required_error: "Accepted flag (true/false) is required" }),
  rating: z.number().min(1).max(5).optional(),
  feedback: z.string().optional().default(""),
  reopenReason: z.string().optional(),
});
