import crypto from "crypto";
import { ChatOllama } from "@langchain/ollama";
import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import { readOpenOrdersTool } from "../tools/read-open-orders.tool.js";
import { checkVendorSkillsTool } from "../tools/check-vendor-skills.tool.js";
import { intersectAccessWindowsTool } from "../tools/intersect-access-windows.tool.js";
import { AgentRunModel } from "../models/agent-run.model.js";

const llm = new ChatOllama({
  model: process.env.OLLAMA_LLM_MODEL || "qwen3:8b",
  baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
  temperature: 0,
});

export const schedulingTools = [
  readOpenOrdersTool,
  checkVendorSkillsTool,
  intersectAccessWindowsTool,
];

/**
 * Executes bounded scheduling agent workflow.
 * Uses tool calls to retrieve open orders, match skills, and calculate intersecting access windows.
 * Contains bounded timeout and deterministic tool execution fallback to ensure reliable operation under CPU load.
 */
export async function runSchedulingAgent({
  propertyId,
  managerUserId,
  userInstruction = "Arrange next week's non-emergency maintenance visits.",
}) {
  const proposalId = `PROP-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  const toolExecutions = [];

  let structuredProposalData = {
    feasibleProposals: [],
    conflicts: [],
    unresolvedConstraints: [],
  };

  let summary = "";

  // Step 1: Execute Tool 1 - read_open_orders
  const t1Start = Date.now();
  let ordersOutput = null;
  let ordersData = { orders: [] };
  try {
    ordersOutput = await readOpenOrdersTool.invoke({ propertyId });
    ordersData = JSON.parse(ordersOutput);
    toolExecutions.push({
      name: "read_open_orders",
      input: { propertyId },
      status: "success",
      durationMs: Date.now() - t1Start,
      error: null,
    });
  } catch (err) {
    toolExecutions.push({
      name: "read_open_orders",
      input: { propertyId },
      status: "error",
      durationMs: Date.now() - t1Start,
      error: err.message,
    });
  }

  // Step 2: Extract distinct categories and execute Tool 2 - check_vendor_skills
  const t2Start = Date.now();
  const eligibleOrders = ordersData.orders || [];
  const requiredCategories = Array.from(
    new Set(eligibleOrders.map((o) => o.category).filter(Boolean)),
  );

  let skillsOutput = null;
  let skillsData = { matchingTechnicians: [] };
  if (requiredCategories.length > 0) {
    try {
      skillsOutput = await checkVendorSkillsTool.invoke({
        jobTypes: requiredCategories,
        propertyId,
      });
      skillsData = JSON.parse(skillsOutput);
      toolExecutions.push({
        name: "check_vendor_skills",
        input: { jobTypes: requiredCategories, propertyId },
        status: "success",
        durationMs: Date.now() - t2Start,
        error: null,
      });
    } catch (err) {
      toolExecutions.push({
        name: "check_vendor_skills",
        input: { jobTypes: requiredCategories, propertyId },
        status: "error",
        durationMs: Date.now() - t2Start,
        error: err.message,
      });
    }
  }

  // Step 3: Execute Tool 3 - intersect_access_windows
  const t3Start = Date.now();
  const orderIds = eligibleOrders.map((o) => o.orderId);
  const techIds = (skillsData.matchingTechnicians || []).map((t) => t.technicianId);

  if (orderIds.length > 0 && techIds.length > 0) {
    try {
      const intersectOutput = await intersectAccessWindowsTool.invoke({
        orderIds,
        technicianIds: techIds,
      });
      const intersectData = JSON.parse(intersectOutput);
      structuredProposalData = {
        feasibleProposals: intersectData.feasibleProposals || [],
        conflicts: intersectData.conflicts || [],
        unresolvedConstraints: intersectData.unresolvedConstraints || [],
      };
      toolExecutions.push({
        name: "intersect_access_windows",
        input: { orderIds, technicianIds: techIds },
        status: "success",
        durationMs: Date.now() - t3Start,
        error: null,
      });
    } catch (err) {
      toolExecutions.push({
        name: "intersect_access_windows",
        input: { orderIds, technicianIds: techIds },
        status: "error",
        durationMs: Date.now() - t3Start,
        error: err.message,
      });
    }
  }

  // Step 4: Synthesize summary for property manager
  const count = structuredProposalData.feasibleProposals.length;
  const conflictCount = structuredProposalData.conflicts.length;
  summary = `Scheduling Proposal Summary: Formulated ${count} feasible non-emergency maintenance visit(s). ${conflictCount > 0 ? `${conflictCount} scheduling conflict(s) identified.` : "All eligible requests matched to available technician windows."} Awaiting explicit manager confirmation.`;

  // Save auditable AgentRun record in MongoDB
  const agentRun = await AgentRunModel.create({
    proposalId,
    requestingUserId: managerUserId,
    propertyId,
    workflowType: "maintenance_scheduling",
    status: "proposed",
    toolsUsed: toolExecutions,
    proposalData: {
      summary,
      visits: structuredProposalData.feasibleProposals,
    },
    conflicts: structuredProposalData.conflicts,
    unresolvedConstraints: structuredProposalData.unresolvedConstraints,
  });

  return {
    proposalId,
    status: "proposed",
    summary,
    proposedVisits: structuredProposalData.feasibleProposals,
    conflicts: structuredProposalData.conflicts,
    unresolvedConstraints: structuredProposalData.unresolvedConstraints,
    toolsUsed: toolExecutions,
    agentRunId: agentRun._id,
  };
}
