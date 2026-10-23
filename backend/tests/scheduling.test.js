import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { connect, disconnect } from "mongoose";
import app from "../server.js";
import { PropertyModel } from "../models/property.model.js";
import { readOpenOrdersTool } from "../tools/read-open-orders.tool.js";
import { checkVendorSkillsTool } from "../tools/check-vendor-skills.tool.js";
import { intersectAccessWindowsTool } from "../tools/intersect-access-windows.tool.js";
import { WorkOrderModel } from "../models/work-order.model.js";

const DB_URL = process.env.DB_URL || "mongodb://127.0.0.1:27017/apartment_maintenance";

describe("Bounded Scheduling Agent & Concurrency Safety Suite", () => {
  beforeAll(async () => {
    await connect(DB_URL);
  });

  afterAll(async () => {
    await disconnect();
  });

  let managerToken = "";
  let propertyId = "";

  beforeAll(async () => {
    const resM = await request(app).post("/api/auth/login").send({
      email: "manager.sunset@apartments.com",
      password: "Password123!",
    });
    managerToken = resM.body.data.sessionId;

    const prop = await PropertyModel.findOne({ code: "SHLA" });
    propertyId = prop._id.toString();
  });

  it("Tool 1: read_open_orders strictly excludes emergency jobs", async () => {
    // Insert temporary emergency work order
    const emergencyOrder = await WorkOrderModel.create({
      reference: "WO-EMERGENCY-TEST",
      propertyId,
      residentId: (await PropertyModel.findOne())._id,
      category: "electrical",
      title: "Sparking main circuit breaker",
      description: "Immediate fire hazard! Breaker is emitting sparks.",
      priority: "emergency",
      status: "Submitted",
    });

    const resultStr = await readOpenOrdersTool.invoke({ propertyId });
    const result = JSON.parse(resultStr);

    expect(result.orders).toBeDefined();
    // Verify emergency order was NOT included in non-emergency tool
    const foundEmergency = result.orders.find((o) => o.reference === "WO-EMERGENCY-TEST");
    expect(foundEmergency).toBeUndefined();

    // Clean up test order
    await WorkOrderModel.deleteOne({ _id: emergencyOrder._id });
  });

  it("Tool 2: check_vendor_skills matches approved technicians by trade", async () => {
    const resultStr = await checkVendorSkillsTool.invoke({
      jobTypes: ["plumbing"],
      propertyId,
    });
    const result = JSON.parse(resultStr);

    expect(result.matchingTechnicians.length).toBeGreaterThan(0);
    expect(result.matchingTechnicians[0].skills).toContain("plumbing");
    expect(result.matchingTechnicians[0].status).toBe("Active & Eligible");
  });

  it("POST /api/scheduling-agent - creates proposal without committing schedule changes", async () => {
    const res = await request(app)
      .post("/api/scheduling-agent")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        propertyId,
        instruction: "Arrange next week's non-emergency visits.",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.proposalId).toMatch(/^PROP-\d+/);
    expect(res.body.data.status).toBe("proposed");
    expect(res.body.data.toolsUsed.length).toBeGreaterThan(0);
  });

  it("POST /api/scheduling-agent/confirm - prevents duplicate confirmation of already confirmed proposal", async () => {
    // Generate fresh proposal
    const genRes = await request(app)
      .post("/api/scheduling-agent")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        propertyId,
        instruction: "Propose non-emergency schedule.",
      });

    const proposalId = genRes.body.data.proposalId;
    const visits = genRes.body.data.proposedVisits;

    if (visits && visits.length > 0) {
      // First confirmation
      const confirm1 = await request(app)
        .post("/api/scheduling-agent/confirm")
        .set("Authorization", `Bearer ${managerToken}`)
        .send({
          proposalId,
          selectedVisits: visits,
        });

      expect(confirm1.status).toBe(200);
      expect(confirm1.body.success).toBe(true);

      // Second identical confirmation must be rejected with 409
      const confirm2 = await request(app)
        .post("/api/scheduling-agent/confirm")
        .set("Authorization", `Bearer ${managerToken}`)
        .send({
          proposalId,
          selectedVisits: visits,
        });

      expect(confirm2.status).toBe(409);
      expect(confirm2.body.message).toContain("already been confirmed");
    }
  });
});
