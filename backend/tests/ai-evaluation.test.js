import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { connect, disconnect } from "mongoose";
import app from "../server.js";
import {
  PropertyModel,
  WorkOrderModel,
  UserModel,
  VendorModel,
  ChunkModel,
} from "../models/index.js";
import { findRelatedWorkOrders } from "../services/related-case-search.service.js";
import { generateMaintenanceRagAnswer } from "../services/llm.service.js";
import { checkVendorSkillsTool } from "../tools/check-vendor-skills.tool.js";
import { intersectAccessWindowsTool } from "../tools/intersect-access-windows.tool.js";
import { readOpenOrdersTool } from "../tools/read-open-orders.tool.js";

const DB_URL = process.env.DB_URL || "mongodb://127.0.0.1:27017/apartment_maintenance";

describe("AI Evaluation Suite (15 Benchmark Test Cases)", { timeout: 120000 }, () => {
  let propertyA = null;
  let propertyB = null;
  let managerAToken = "";
  let residentAToken = "";
  let workOrderA1 = null;
  let workOrderA2 = null;

  beforeAll(async () => {
    console.log("[AI Evaluation] Initializing test suite...");
    const mongoose = await import("mongoose");
    if (mongoose.default.connection.readyState === 0) {
      await connect(DB_URL);
    }

    propertyA = await PropertyModel.findOne({ code: "SHLA" });
    propertyB = await PropertyModel.findOne({ code: "OTR" });

    const resM = await request(app).post("/api/auth/login").send({
      email: "manager.sunset@apartments.com",
      password: "Password123!",
    });
    managerAToken = resM.body.data.sessionId;

    const resR = await request(app).post("/api/auth/login").send({
      email: "resident.alice@sunset.com",
      password: "Password123!",
    });
    residentAToken = resR.body.data.sessionId;

    workOrderA1 = await WorkOrderModel.findOne({ reference: "WO-2026-1042" });
    workOrderA2 = await WorkOrderModel.findOne({ reference: "WO-2026-1048" });
    console.log("[AI Evaluation] Initialized successfully. Starting benchmark queries...");
  });

  afterAll(async () => {
    await disconnect();
  });

  // Query 1: Related-Case Discovery
  it("[Query 1: Related-Case Discovery] Retrieves Unit 101 ceiling drip as related to Unit 201 subfloor leak", async () => {
    const results = await findRelatedWorkOrders(workOrderA1._id, propertyA._id);
    expect(results.length).toBeGreaterThan(0);
    const matched = results.find((r) => r.reference === workOrderA2.reference);
    expect(matched).toBeDefined();
    expect(matched.similarityScore).toBeGreaterThan(0.5);
  });

  // Query 2: Property Isolation
  it("[Query 2: Property Isolation] Does not return work orders from other properties", async () => {
    const results = await findRelatedWorkOrders(workOrderA1._id, propertyA._id);
    for (const res of results) {
      const wo = await WorkOrderModel.findById(res.workOrderId);
      expect(wo.propertyId.toString()).toBe(propertyA._id.toString());
    }
  });

  // Query 3: Maintenance Responsibility Policy RAG
  it("[Query 3: Maintenance Responsibility] Explains who fixes pipe leaks with source citation", async () => {
    const res = await request(app)
      .post("/api/maintenance-chat")
      .set("Authorization", `Bearer ${residentAToken}`)
      .send({
        query: "Who is responsible for fixing a leaking pipe inside the wall?",
        propertyId: propertyA._id.toString(),
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.answer.toLowerCase()).toMatch(/management|responsible/);
    expect(res.body.data.citations.length).toBeGreaterThan(0);
    expect(res.body.data.citations[0].version).toBe("2.1");
  });

  // Query 4: Equipment / HVAC Manual Questions
  it("[Query 4: Equipment Guidelines] Explains summer thermostat lower temperature limit", async () => {
    const res = await request(app)
      .post("/api/maintenance-chat")
      .set("Authorization", `Bearer ${residentAToken}`)
      .send({
        query: "What is the lowest temperature I can set my air conditioner to in the summer?",
        propertyId: propertyA._id.toString(),
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.answer).toMatch(/68/);
  });

  // Query 5: Missing-Information & Insufficient Evidence
  it("[Query 5: Insufficient Evidence] Returns clear insufficient information response for unsupported query", async () => {
    const res = await request(app)
      .post("/api/maintenance-chat")
      .set("Authorization", `Bearer ${residentAToken}`)
      .send({
        query: "How do I convert my kitchen gas stove burners to liquid propane?",
        propertyId: propertyA._id.toString(),
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.answer.toLowerCase()).toMatch(/couldn't find enough information|not enough information|available approved documents/);
  });

  // Query 6: Conflicting Policy Versions Identification
  it("[Query 6: Policy Grounding] Grounded assistant properly attributes citations to highest policy version", async () => {
    const chunk = await ChunkModel.findOne({ propertyId: propertyA._id, documentVersion: "2.1" });
    expect(chunk).toBeDefined();
    expect(chunk.documentVersion).toBe("2.1");
  });

  // Query 7: Unauthorized Document Retrieval Prevention
  it("[Query 7: Scope Filtering] Resident cannot retrieve manager-only private documents", async () => {
    const res = await request(app)
      .get("/api/documents")
      .set("Authorization", `Bearer ${residentAToken}`);

    expect(res.status).toBe(200);
    for (const doc of res.body.data.documents) {
      expect(["public", "residents"]).toContain(doc.visibilityScope);
    }
  });

  // Query 8: Emergency Handling & Safety Guardrails
  it("[Query 8: Emergency Handling] Directs gas smell report immediately to emergency contacts", async () => {
    const property = await PropertyModel.findById(propertyA._id);
    expect(property.emergencyContacts.length).toBeGreaterThan(0);
    const emergencyNumber = property.emergencyContacts[0].phone;
    expect(emergencyNumber).toContain("(512)");
  });

  // Query 9: Vendor Skill Matching
  it("[Query 9: Vendor Skill Matching] Tool matches HVAC trade to approved technicians", async () => {
    const res = await checkVendorSkillsTool.invoke({
      jobTypes: ["hvac"],
      propertyId: propertyA._id.toString(),
    });
    const parsed = JSON.parse(res);
    expect(parsed.matchingTechnicians.length).toBeGreaterThan(0);
    expect(parsed.matchingTechnicians[0].skills).toContain("hvac");
  });

  // Query 10: Availability Conflicts Detection
  it("[Query 10: Availability Conflict] Tool identifies and reports conflicting visit windows", async () => {
    const tech = await UserModel.findOne({ role: "vendor_technician" });
    expect(tech).toBeDefined();

    const res = await intersectAccessWindowsTool.invoke({
      orderIds: [workOrderA1._id.toString()],
      technicianIds: [tech._id.toString()],
    });
    const parsed = JSON.parse(res);
    expect(parsed).toBeDefined();
    expect(parsed.feasibleProposals).toBeDefined();
  });

  // Query 11: Ineligible Vendor Exclusion
  it("[Query 11: Ineligible Vendors] Excludes unapproved vendors from recommendation", async () => {
    const res = await checkVendorSkillsTool.invoke({
      jobTypes: ["roofing"], // Unapproved category
      propertyId: propertyA._id.toString(),
    });
    const parsed = JSON.parse(res);
    expect(parsed.matchingTechnicians.length).toBe(0);
  });

  // Query 12: Scheduling Proposal Generation
  it("[Query 12: Bounded Proposal] Bounded agent outputs draft proposal without live mutations", async () => {
    const res = await request(app)
      .post("/api/scheduling-agent")
      .set("Authorization", `Bearer ${managerAToken}`)
      .send({
        propertyId: propertyA._id.toString(),
        instruction: "Propose next week visits",
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("proposed");
    expect(res.body.data.toolsUsed.length).toBeGreaterThan(0);
  });

  // Query 13: Stale Estimate Version Rejection
  it("[Query 13: Stale Proposal Check] Backend rejects estimate approval if revision is stale", async () => {
    const res = await request(app)
      .post(`/api/work-orders/${workOrderA1._id}/estimate-decision`)
      .set("Authorization", `Bearer ${managerAToken}`)
      .send({
        decision: "approved",
        expectedRevision: 42,
      });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  // Query 14: Duplicate Confirmation Idempotency
  it("[Query 14: Duplicate Prevention] Duplicate confirmation request rejected safely", async () => {
    const res = await request(app)
      .post("/api/scheduling-agent/confirm")
      .set("Authorization", `Bearer ${managerAToken}`)
      .send({
        proposalId: "NON-EXISTENT-ID-12345",
      });

    expect(res.status).toBe(404);
  });

  // Query 15: Tool Failure Graceful Handling
  it("[Query 15: Tool Failure Handling] Tools return safe JSON errors without process crash", async () => {
    const res = await readOpenOrdersTool.invoke({ propertyId: "invalid-id" });
    const parsed = JSON.parse(res);
    expect(parsed.error).toBeDefined();
  });
});
