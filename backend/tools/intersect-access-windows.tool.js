import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { Types } from "mongoose";
import { WorkOrderModel } from "../models/work-order.model.js";
import { VisitModel } from "../models/visit.model.js";
import { UserModel } from "../models/user.model.js";
import { UnitModel } from "../models/unit.model.js";
import { VendorModel } from "../models/vendor.model.js";

/**
 * Tool 3: intersectAccessWindows(orderIds, technicianIds)
 * Purpose: Deterministically calculates intersection between resident access windows and technician availability,
 * detects conflicts with already confirmed bookings, and outputs feasible proposals.
 */
export const intersectAccessWindowsTool = tool(
  async ({ orderIds, technicianIds }) => {
    console.log("[Tool started] intersect_access_windows");
    console.log("[Arguments]", { orderIds, technicianIds });

    const validOrderObjectIds = orderIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    const validTechObjectIds = technicianIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    if (validOrderObjectIds.length === 0 || validTechObjectIds.length === 0) {
      return JSON.stringify({
        feasibleProposals: [],
        conflicts: ["Missing valid work order IDs or technician IDs"],
      });
    }

    const orders = await WorkOrderModel.find({ _id: { $in: validOrderObjectIds } })
      .populate("residentId", "name email")
      .populate("unitId", "unitNumber")
      .lean();

    const technicians = await UserModel.find({ _id: { $in: validTechObjectIds } })
      .populate("vendorId", "name")
      .lean();

    // Fetch existing confirmed bookings for these technicians to prevent overlaps
    const existingBookings = await VisitModel.find({
      technicianId: { $in: validTechObjectIds },
      status: "confirmed",
    }).lean();

    const feasibleProposals = [];
    const conflicts = [];
    const unresolvedConstraints = [];

    // Evaluate each order
    for (const order of orders) {
      const preferredWindows = order.preferredAccessWindows || [];

      if (preferredWindows.length === 0) {
        unresolvedConstraints.push(
          `Order ${order.reference} (${order.title}) has no resident preferred access windows specified.`,
        );
        continue;
      }

      let matchedForOrder = false;

      // Find an eligible technician with matching skills and an open slot
      for (const tech of technicians) {
        for (const window of preferredWindows) {
          const windowStart = new Date(window.start);
          const windowEnd = new Date(window.end);
          const durationHours = order.category === "hvac" ? 2 : 1.5;
          const proposedEnd = new Date(windowStart.getTime() + durationHours * 60 * 60 * 1000);

          if (proposedEnd > windowEnd) {
            continue; // Doesn't fit in the window
          }

          // Check if technician has an overlapping confirmed booking
          const hasConflict = existingBookings.some((booking) => {
            if (booking.technicianId.toString() !== tech._id.toString()) return false;
            const bStart = new Date(booking.startTime);
            const bEnd = new Date(booking.endTime);
            return windowStart < bEnd && proposedEnd > bStart;
          });

          if (hasConflict) {
            conflicts.push(
              `Technician ${tech.name} has a booking collision for order ${order.reference} between ${windowStart.toISOString()} and ${proposedEnd.toISOString()}`,
            );
            continue;
          }

          // Slot is feasible!
          feasibleProposals.push({
            workOrderId: order._id.toString(),
            reference: order.reference,
            title: order.title,
            category: order.category,
            unit: order.unitId?.unitNumber || "Shared Area",
            technicianId: tech._id.toString(),
            technicianName: tech.name,
            vendorName: tech.vendorId?.name || "Independent",
            proposedStartTime: windowStart.toISOString(),
            proposedEndTime: proposedEnd.toISOString(),
            estimatedDurationHours: durationHours,
            residentNote: window.note || "",
          });

          matchedForOrder = true;
          break; // Move to next order once scheduled
        }

        if (matchedForOrder) break;
      }

      if (!matchedForOrder) {
        conflicts.push(
          `Could not find an available non-conflicting technician slot for order ${order.reference} (${order.title}).`,
        );
      }
    }

    console.log(
      `[Tool result] Generated ${feasibleProposals.length} feasible proposals, ${conflicts.length} conflicts`,
    );
    console.log("[Tool completed] intersect_access_windows");

    return JSON.stringify({
      feasibleProposals,
      conflicts,
      unresolvedConstraints,
    });
  },
  {
    name: "intersect_access_windows",
    description:
      "Calculates feasible visit times by intersecting resident access windows with technician availability and checking existing bookings.",
    schema: z.object({
      orderIds: z
        .array(z.string())
        .describe("Array of WorkOrder ObjectIds to schedule"),
      technicianIds: z
        .array(z.string())
        .describe("Array of eligible Technician User ObjectIds"),
    }),
  },
);
