import express from "express";
import { Types } from "mongoose";
import { VendorModel } from "../models/vendor.model.js";
import { UserModel } from "../models/user.model.js";
import { authenticateSession } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/authorize.middleware.js";
import { logAuditEvent } from "../services/audit.service.js";

export const vendorRouter = express.Router();

vendorRouter.use(authenticateSession);

/**
 * GET /api/vendors
 * List approved vendors filtered by property or service category.
 */
vendorRouter.get("/", async (req, res) => {
  const { propertyId, category } = req.query;

  const filter = { status: "approved" };
  if (category) filter.serviceCategories = category.toLowerCase();
  if (propertyId && Types.ObjectId.isValid(propertyId)) {
    filter.approvedProperties = new Types.ObjectId(propertyId);
  }

  const vendors = await VendorModel.find(filter).lean();

  res.status(200).json({
    success: true,
    data: {
      vendors,
    },
  });
});

/**
 * GET /api/vendors/:id/technicians
 * List active technicians belonging to an approved vendor organization.
 */
vendorRouter.get("/:id/technicians", async (req, res) => {
  const { id } = req.params;

  const technicians = await UserModel.find({
    vendorId: id,
    role: "vendor_technician",
    accountStatus: "active",
  })
    .select("name email phone skills accountStatus")
    .lean();

  res.status(200).json({
    success: true,
    data: {
      technicians,
    },
  });
});

/**
 * POST /api/vendors
 * Manager registers an approved vendor organization.
 */
vendorRouter.post(
  "/",
  requireRole("property_manager", "admin"),
  async (req, res) => {
    const {
      name,
      contactEmail,
      phone,
      serviceCategories,
      skills,
      approvedProperties,
      hourlyRate,
    } = req.body;

    if (!name || !contactEmail || !phone || !serviceCategories?.length) {
      const error = new Error("Name, contactEmail, phone, and serviceCategories are required.");
      error.statusCode = 400;
      throw error;
    }

    const vendor = await VendorModel.create({
      name: name.trim(),
      contactEmail: contactEmail.trim().toLowerCase(),
      phone: phone.trim(),
      serviceCategories,
      skills: skills || [],
      approvedProperties: approvedProperties || [],
      hourlyRate: hourlyRate || 85,
      status: "approved",
    });

    await logAuditEvent({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "VENDOR_REGISTERED",
      resourceType: "Vendor",
      resourceId: vendor._id,
      description: `Registered vendor ${vendor.name}`,
      req,
    });

    res.status(201).json({
      success: true,
      message: "Vendor registered successfully.",
      data: {
        vendor,
      },
    });
  },
);
