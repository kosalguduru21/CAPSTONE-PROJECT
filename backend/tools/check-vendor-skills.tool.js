import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { Types } from "mongoose";
import { VendorModel } from "../models/vendor.model.js";
import { UserModel } from "../models/user.model.js";

/**
 * Tool 2: checkVendorSkills(jobTypes, propertyId)
 * Purpose: Retrieve approved vendor technicians matching required job categories and property eligibility.
 * Suspended or unapproved vendors are strictly excluded.
 */
export const checkVendorSkillsTool = tool(
  async ({ jobTypes, propertyId }) => {
    console.log("[Tool started] check_vendor_skills");
    console.log("[Arguments]", { jobTypes, propertyId });

    const normalizedCategories = jobTypes.map((t) => t.toLowerCase().trim());

    // Find vendors that are strictly "approved", service these categories, and are permitted for this property
    const vendorQuery = {
      status: "approved",
      serviceCategories: { $in: normalizedCategories },
    };

    if (propertyId && Types.ObjectId.isValid(propertyId)) {
      vendorQuery.approvedProperties = new Types.ObjectId(propertyId);
    }

    const eligibleVendors = await VendorModel.find(vendorQuery).lean();

    if (eligibleVendors.length === 0) {
      return JSON.stringify({
        matchingTechnicians: [],
        message: "No active approved vendors found matching the specified categories for this property.",
      });
    }

    const vendorIds = eligibleVendors.map((v) => v._id);

    // Find active technicians belonging to these vendors
    const technicians = await UserModel.find({
      role: "vendor_technician",
      accountStatus: "active",
      vendorId: { $in: vendorIds },
    })
      .populate("vendorId", "name serviceCategories rating hourlyRate")
      .lean();

    const matchingTechnicians = technicians.map((tech) => ({
      technicianId: tech._id.toString(),
      technicianName: tech.name,
      email: tech.email,
      vendorName: tech.vendorId?.name || "Independent",
      vendorId: tech.vendorId?._id?.toString(),
      skills: tech.skills || [],
      hourlyRate: tech.vendorId?.hourlyRate || 85,
      rating: tech.vendorId?.rating || 4.8,
      status: "Active & Eligible",
    }));

    console.log(`[Tool result] Found ${matchingTechnicians.length} eligible technicians`);
    console.log("[Tool completed] check_vendor_skills");

    return JSON.stringify({
      count: matchingTechnicians.length,
      matchingTechnicians,
    });
  },
  {
    name: "check_vendor_skills",
    description:
      "Find approved, active vendor technicians whose skills match required job types for an authorized property.",
    schema: z.object({
      jobTypes: z
        .array(z.string())
        .describe("Array of job categories or skills (e.g. ['plumbing', 'electrical', 'hvac'])"),
      propertyId: z
        .string()
        .optional()
        .describe("The property ObjectId to filter vendor authorization"),
    }),
  },
);
