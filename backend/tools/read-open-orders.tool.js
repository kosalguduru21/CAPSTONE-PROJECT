import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { Types } from "mongoose";
import { WorkOrderModel } from "../models/work-order.model.js";
import { UnitModel } from "../models/unit.model.js";
import { BuildingModel } from "../models/building.model.js";

/**
 * Tool 1: readOpenOrders(propertyId)
 * Purpose: Retrieve eligible open maintenance jobs for an authorized property.
 * Strictly excludes emergency jobs, cancelled, and resolved jobs.
 */
export const readOpenOrdersTool = tool(
  async ({ propertyId }) => {
    console.log("[Tool started] read_open_orders");
    console.log("[Arguments]", { propertyId });

    if (!propertyId || !Types.ObjectId.isValid(propertyId)) {
      return JSON.stringify({
        error: "Valid Property ObjectId is required",
        orders: [],
      });
    }

    // Exclude emergency jobs, cancelled, resolved, rejected, and already scheduled/completed jobs
    const eligibleStatuses = [
      "Submitted",
      "Under Review",
      "Awaiting Estimate",
      "Awaiting Approval",
      "Approved",
      "Assigned",
      "Reopened",
    ];

    const openOrders = await WorkOrderModel.find({
      propertyId: new Types.ObjectId(propertyId),
      priority: { $ne: "emergency" },
      status: { $in: eligibleStatuses },
    })
      .populate("unitId", "unitNumber")
      .populate("buildingId", "name code")
      .lean();

    const formattedOrders = openOrders.map((order) => {
      const hasAccessWindows =
        Array.isArray(order.preferredAccessWindows) &&
        order.preferredAccessWindows.length > 0;

      return {
        orderId: order._id.toString(),
        reference: order.reference,
        title: order.title,
        category: order.category,
        priority: order.priority,
        status: order.status,
        unit: order.unitId?.unitNumber || "Shared Area",
        building: order.buildingId?.code || "Main",
        estimatedDurationHours:
          order.category === "hvac" || order.category === "appliances" ? 2 : 1.5,
        hasPreferredAccessWindows: hasAccessWindows,
        preferredAccessWindows: hasAccessWindows
          ? order.preferredAccessWindows.map((w) => ({
              start: w.start,
              end: w.end,
              note: w.note || "",
            }))
          : [],
        missingInformation: !hasAccessWindows
          ? ["Resident access window not yet specified"]
          : [],
      };
    });

    console.log(`[Tool result] Retrieved ${formattedOrders.length} eligible open orders`);
    console.log("[Tool completed] read_open_orders");

    return JSON.stringify({
      count: formattedOrders.length,
      orders: formattedOrders,
    });
  },
  {
    name: "read_open_orders",
    description:
      "Retrieve non-emergency open maintenance orders for an authorized property with required categories and access preferences. Excludes emergencies.",
    schema: z.object({
      propertyId: z.string().describe("The MongoDB ObjectId of the property to query"),
    }),
  },
);
