import { AuditEventModel } from "../models/audit-event.model.js";

/**
 * Records auditable events in the system for security and compliance.
 */
export async function logAuditEvent({
  actorId = null,
  actorRole = "system",
  action,
  propertyId = null,
  resourceType,
  resourceId = null,
  description = "",
  beforeState = null,
  afterState = null,
  req = null,
}) {
  try {
    const ipAddress = req?.ip || req?.headers?.["x-forwarded-for"] || "";
    const userAgent = req?.headers?.["user-agent"] || "";

    await AuditEventModel.create({
      actorId,
      actorRole,
      action,
      propertyId,
      resourceType,
      resourceId,
      description,
      beforeState,
      afterState,
      ipAddress,
      userAgent,
    });
  } catch (err) {
    console.error("[Audit Service] Failed to record audit event:", err.message);
  }
}
