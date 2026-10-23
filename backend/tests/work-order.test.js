import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { connect, disconnect } from "mongoose";
import app from "../server.js";
import { PropertyModel } from "../models/property.model.js";
import { UnitModel } from "../models/unit.model.js";
import { WorkOrderModel } from "../models/work-order.model.js";
import { VendorModel } from "../models/vendor.model.js";
import { UserModel } from "../models/user.model.js";

const DB_URL = process.env.DB_URL || "mongodb://127.0.0.1:27017/apartment_maintenance";

describe("Work-Order Lifecycle & Estimate Rules Suite", () => {
  beforeAll(async () => {
    await connect(DB_URL);
  });

  afterAll(async () => {
    await disconnect();
  });

  let residentToken = "";
  let managerToken = "";
  let technicianToken = "";
  let propertyId = "";
  let unitId = "";
  let createdWorkOrderId = "";
  let createdAssignmentId = "";

  beforeAll(async () => {
    const resR = await request(app).post("/api/auth/login").send({
      email: "resident.alice@sunset.com",
      password: "Password123!",
    });
    residentToken = resR.body.data.sessionId;

    const resM = await request(app).post("/api/auth/login").send({
      email: "manager.sunset@apartments.com",
      password: "Password123!",
    });
    managerToken = resM.body.data.sessionId;

    const resT = await request(app).post("/api/auth/login").send({
      email: "tech.mario@apexplumbing.com",
      password: "Password123!",
    });
    technicianToken = resT.body.data.sessionId;

    const prop = await PropertyModel.findOne({ code: "SHLA" });
    propertyId = prop._id.toString();

    const unit = await UnitModel.findOne({ unitNumber: "201" });
    unitId = unit._id.toString();
  });

  it("POST /api/work-orders - creates valid work order with initial Submitted timeline", async () => {
    const res = await request(app)
      .post("/api/work-orders")
      .set("Authorization", `Bearer ${residentToken}`)
      .send({
        propertyId,
        unitId,
        category: "fixtures",
        title: "Loose bathroom shower grab bar",
        description: "The safety grab bar next to the bathtub is wobbly and needs securing.",
        priority: "normal",
        preferredAccessWindows: [
          {
            start: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            end: new Date(Date.now() + 52 * 60 * 60 * 1000).toISOString(),
            note: "Anytime afternoon",
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.workOrder.reference).toMatch(/^WO-\d{4}-\d{4}$/);
    expect(res.body.data.workOrder.status).toBe("Submitted");
    createdWorkOrderId = res.body.data.workOrder._id;
  });

  it("POST /api/work-orders/:id/assignment - manager assigns approved vendor & technician", async () => {
    const vendor = await VendorModel.findOne({ name: "Apex Plumbing & Drain Solutions" });
    const tech = await UserModel.findOne({ email: "tech.mario@apexplumbing.com" });

    const res = await request(app)
      .post(`/api/work-orders/${createdWorkOrderId}/assignment`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        vendorId: vendor._id.toString(),
        technicianId: tech._id.toString(),
        notes: "Please inspect grab bar mounting screws and drywall anchors.",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.workOrder.status).toBe("Assigned");
    createdAssignmentId = res.body.data.assignment._id;
  });

  it("POST /api/estimates - server deterministically validates and calculates itemized totals", async () => {
    const res = await request(app)
      .post("/api/estimates")
      .set("Authorization", `Bearer ${technicianToken}`)
      .send({
        workOrderId: createdWorkOrderId,
        assignmentId: createdAssignmentId,
        lineItems: [
          {
            description: "Heavy-duty stainless wall anchor kit",
            quantity: 2,
            unitPrice: 22.5,
          },
          {
            description: "Waterproof silicone tub sealant",
            quantity: 1,
            unitPrice: 15.0,
          },
        ],
        laborCost: 80,
        materialCost: 60,
        taxAmount: 11.2,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    // 2 * 22.5 (45) + 1 * 15 (15) + 80 + 60 = 200 subtotal + 11.2 tax = 211.2 total
    expect(res.body.data.estimate.subtotal).toBe(200);
    expect(res.body.data.estimate.totalAmount).toBe(211.2);
    expect(res.body.data.estimate.revision).toBe(1);
  });

  it("POST /api/work-orders/:id/estimate-decision - rejects stale revision race condition", async () => {
    const res = await request(app)
      .post(`/api/work-orders/${createdWorkOrderId}/estimate-decision`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        decision: "approved",
        expectedRevision: 999, // Intentional stale revision mismatch
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("Stale estimate version");
  });

  it("POST /api/work-orders/:id/estimate-decision - manager approves current estimate", async () => {
    const res = await request(app)
      .post(`/api/work-orders/${createdWorkOrderId}/estimate-decision`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        decision: "approved",
        expectedRevision: 1,
        comments: "Approved within property maintenance budget.",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.workOrder.status).toBe("Approved");
  });

  it("POST /api/assignments/:id/completion - vendor submits completion evidence; moves to review (NOT auto-resolved)", async () => {
    const res = await request(app)
      .post(`/api/assignments/${createdAssignmentId}/completion`)
      .set("Authorization", `Bearer ${technicianToken}`)
      .send({
        completionNotes: "Mounted two toggle bolt anchors into wall framing. Grab bar load tested up to 250 lbs.",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.workOrder.status).toBe("Work Completed — Awaiting Review");
  });

  it("POST /api/work-orders/:id/completion-review - resident confirms resolution and closes order", async () => {
    const res = await request(app)
      .post(`/api/work-orders/${createdWorkOrderId}/completion-review`)
      .set("Authorization", `Bearer ${residentToken}`)
      .send({
        accepted: true,
        feedback: "Shower bar is completely solid now. Excellent work!",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.workOrder.status).toBe("Resolved");
  });
});
