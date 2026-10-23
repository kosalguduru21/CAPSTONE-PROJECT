import { z } from "zod";

export const lineItemValidator = z.object({
  description: z.string().min(2, "Description is required"),
  quantity: z.number().min(0.1, "Quantity must be greater than 0"),
  unitPrice: z.number().min(0, "Unit price must be non-negative"),
});

export const createEstimateSchema = z.object({
  workOrderId: z.string().min(1, "Work order ID is required"),
  assignmentId: z.string().min(1, "Assignment ID is required"),
  lineItems: z.array(lineItemValidator).min(1, "At least one line item is required"),
  laborCost: z.number().min(0).default(0),
  materialCost: z.number().min(0).default(0),
  taxAmount: z.number().min(0).default(0),
  currency: z.string().default("USD"),
  exclusions: z.string().optional(),
  assumptions: z.string().optional(),
  validDays: z.number().min(1).default(30),
});

export const estimateDecisionSchema = z.object({
  decision: z.enum(["approved", "rejected", "revision_requested"]),
  comments: z.string().optional().default(""),
  expectedRevision: z.number().min(1).describe("The revision number being acted upon to prevent stale race conditions"),
});
