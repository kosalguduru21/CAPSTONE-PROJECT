import express from "express";
import { connect } from "mongoose";
import { config } from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

// Load environment variables
config();

// Ensure all Mongoose schemas are registered
import "./models/index.js";

// Routers
import { authRouter } from "./api/auth.router.js";
import { communityRouter } from "./api/community.router.js";
import { workOrderRouter } from "./api/work-order.router.js";
import { assignmentRouter } from "./api/assignment.router.js";
import { estimateRouter } from "./api/estimate.router.js";
import { documentRouter } from "./api/document.router.js";
import { maintenanceChatRouter } from "./api/maintenance-chat.router.js";
import { relatedCaseRouter } from "./api/related-case.router.js";
import { schedulingAgentRouter } from "./api/scheduling-agent.router.js";
import { propertyRouter } from "./api/property.router.js";
import { vendorRouter } from "./api/vendor.router.js";
import { notificationRouter } from "./api/notification.router.js";
import { errorHandler } from "./middlewares/error.middleware.js";

const app = express();

// Middlewares
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-csrf-token", "x-session-id"],
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// API Routers
app.use("/api/auth", authRouter);
app.use("/api/community", communityRouter);
app.use("/api", communityRouter); // Mounts /api/notices and /api/community-info directly as required in Section 13
app.use("/api/work-orders", workOrderRouter);
app.use("/api/assignments", assignmentRouter);
app.use("/api/estimates", estimateRouter);
app.use("/api/documents", documentRouter);
app.use("/api/maintenance-chat", maintenanceChatRouter);
app.use("/api/related-cases", relatedCaseRouter);
app.use("/api/scheduling-agent", schedulingAgentRouter);
app.use("/api/properties", propertyRouter);
app.use("/api/vendors", vendorRouter);
app.use("/api/notifications", notificationRouter);

// Health check endpoint with database & AI subsystem check
app.get("/api/health", async (req, res) => {
  let dbStatus = "connected";
  let ollamaStatus = "unknown";

  try {
    const ollamaResponse = await fetch(
      `${process.env.OLLAMA_BASE_URL || "http://localhost:11434"}/api/tags`,
    );
    ollamaStatus = ollamaResponse.ok ? "healthy" : "unavailable";
  } catch (e) {
    ollamaStatus = "offline";
  }

  res.status(200).json({
    success: true,
    data: {
      status: "operational",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: dbStatus,
      ollama: {
        status: ollamaStatus,
        llmModel: process.env.OLLAMA_LLM_MODEL || "qwen3:8b",
        embeddingModel: process.env.OLLAMA_EMBEDDING_MODEL || "qwen3-embedding:4b",
      },
    },
  });
});

// Centralized error handling middleware
app.use(errorHandler);

export async function connectDB() {
  const dbUrl = process.env.DB_URL || "mongodb://127.0.0.1:27017/apartment_maintenance";
  try {
    await connect(dbUrl);
    console.log(`[MongoDB] Connected successfully to ${dbUrl}`);
    const port = process.env.PORT || 5000;
    if (process.env.NODE_ENV !== "test") {
      app.listen(port, () =>
        console.log(`[Server] Apartment Maintenance API listening on port ${port}`),
      );
    }
  } catch (err) {
    console.error("[MongoDB] Connection error:", err.message);
  }
}

// Start HTTP server if not in test environment
if (process.env.NODE_ENV !== "test") {
  connectDB();
}

export default app;
