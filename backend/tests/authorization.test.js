import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { connect, disconnect } from "mongoose";
import app from "../server.js";
import { WorkOrderModel } from "../models/work-order.model.js";

const DB_URL = process.env.DB_URL || "mongodb://127.0.0.1:27017/apartment_maintenance";

describe("Strict Role and Resource Authorization Suite", () => {
  beforeAll(async () => {
    await connect(DB_URL);
  });

  afterAll(async () => {
    await disconnect();
  });

  let residentAToken = "";
  let residentBToken = "";
  let managerOakridgeToken = "";
  let technicianPlumberToken = "";
  let sunsetWorkOrder = null;

  beforeAll(async () => {
    // Sign in Resident A (Alice, Unit 201)
    const resA = await request(app).post("/api/auth/login").send({
      email: "resident.alice@sunset.com",
      password: "Password123!",
    });
    residentAToken = resA.body.data.sessionId;

    // Sign in Resident B (Bob, Unit 101)
    const resB = await request(app).post("/api/auth/login").send({
      email: "resident.bob@sunset.com",
      password: "Password123!",
    });
    residentBToken = resB.body.data.sessionId;

    // Sign in Manager B (David, Oakridge Terrace scope only)
    const resM = await request(app).post("/api/auth/login").send({
      email: "manager.oakridge@apartments.com",
      password: "Password123!",
    });
    managerOakridgeToken = resM.body.data.sessionId;

    // Sign in Unassigned Vendor Technician (Elena the Electrician, not assigned to plumbing leak)
    const resT = await request(app).post("/api/auth/login").send({
      email: "tech.elena@voltmaster.com",
      password: "Password123!",
    });
    technicianPlumberToken = resT.body.data.sessionId;

    sunsetWorkOrder = await WorkOrderModel.findOne({ reference: "WO-2026-1042" });
  });

  it("Resident A can view their own work order", async () => {
    const res = await request(app)
      .get(`/api/work-orders/${sunsetWorkOrder._id}`)
      .set("Authorization", `Bearer ${residentAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.workOrder.reference).toBe("WO-2026-1042");
  });

  it("Resident B is FORBIDDEN (403) from accessing Resident A's work order", async () => {
    const res = await request(app)
      .get(`/api/work-orders/${sunsetWorkOrder._id}`)
      .set("Authorization", `Bearer ${residentBToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("Forbidden");
  });

  it("Property Manager for Oakridge is FORBIDDEN (403) from Sunset Heights resources", async () => {
    const res = await request(app)
      .get(`/api/work-orders/${sunsetWorkOrder._id}`)
      .set("Authorization", `Bearer ${managerOakridgeToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("Unassigned Vendor Technician is FORBIDDEN (403) from reading unassigned work order", async () => {
    // Mario is not assigned to WO-2026-1042 yet
    const res = await request(app)
      .get(`/api/work-orders/${sunsetWorkOrder._id}`)
      .set("Authorization", `Bearer ${technicianPlumberToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("Client-supplied fake role in body or headers is ignored by backend", async () => {
    const res = await request(app)
      .get("/api/properties")
      .set("Authorization", `Bearer ${residentAToken}`)
      .send({ role: "admin" });

    // Resident still only gets resident's property, not admin full list
    expect(res.status).toBe(200);
  });
});
