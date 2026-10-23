import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { connect, disconnect } from "mongoose";
import app from "../server.js";
import { UserModel } from "../models/user.model.js";

const DB_URL = process.env.DB_URL || "mongodb://127.0.0.1:27017/apartment_maintenance";

describe("Authentication & Account Security Suite", () => {
  beforeAll(async () => {
    await connect(DB_URL);
  });

  afterAll(async () => {
    await disconnect();
  });

  const testEmail = `test.resident.${Date.now()}@example.com`;
  let verificationToken = "";
  let sessionId = "";

  it("POST /api/auth/register - successfully registers least-privileged resident account", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: testEmail,
      password: "Password123!",
      name: "Test Resident",
      phone: "(555) 000-1111",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe("resident");

    const userInDb = await UserModel.findOne({ email: testEmail });
    expect(userInDb).toBeDefined();
    expect(userInDb.emailVerified).toBe(false);
    expect(userInDb.verificationToken).toBeTruthy();
    verificationToken = userInDb.verificationToken;
  });

  it("POST /api/auth/verify-email - rejects invalid token", async () => {
    const res = await request(app).post("/api/auth/verify-email").send({
      token: "invalid-token-12345",
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("POST /api/auth/verify-email - verifies email with valid single-use token", async () => {
    const res = await request(app).post("/api/auth/verify-email").send({
      token: verificationToken,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const user = await UserModel.findOne({ email: testEmail });
    expect(user.emailVerified).toBe(true);
    expect(user.verificationToken).toBeNull();
  });

  it("POST /api/auth/login - rejects invalid password", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: testEmail,
      password: "WrongPassword!",
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("POST /api/auth/login - logs in successfully and rotates session", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: testEmail,
      password: "Password123!",
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sessionId).toBeTruthy();
    expect(res.body.data.csrfToken).toBeTruthy();
    sessionId = res.body.data.sessionId;

    // Check HttpOnly cookie
    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toContain("sessionId=");
    expect(cookies[0]).toContain("HttpOnly");
  });

  it("GET /api/auth/me - returns authenticated user profile", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${sessionId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testEmail);
  });

  it("POST /api/auth/logout - revokes server session", async () => {
    const res = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${sessionId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Subsequent authenticated request must now fail with 401
    const resAfter = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${sessionId}`);

    expect(resAfter.status).toBe(401);
  });
});
