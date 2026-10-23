import express from "express";
import { PropertyModel } from "../models/property.model.js";

export const communityRouter = express.Router();

/**
 * GET /api/community-info
 * Returns published office hours, emergency contact channels, and community details.
 */
communityRouter.get("/community-info", async (req, res) => {
  const { propertyId } = req.query;

  let query = { status: "active" };
  if (propertyId) {
    query._id = propertyId;
  }

  const properties = await PropertyModel.find(query).select(
    "name code address timezone officeHours emergencyContacts status",
  );

  res.status(200).json({
    success: true,
    data: {
      properties,
    },
  });
});

/**
 * GET /api/notices
 * Returns notices approved for public access across active properties.
 */
communityRouter.get("/notices", async (req, res) => {
  const { propertyId } = req.query;

  let query = { status: "active" };
  if (propertyId) {
    query._id = propertyId;
  }

  const properties = await PropertyModel.find(query).select("name notices");

  const publicNotices = [];
  for (const prop of properties) {
    for (const notice of prop.notices || []) {
      if (notice.isPublic) {
        publicNotices.push({
          propertyId: prop._id,
          propertyName: prop.name,
          title: notice.title,
          content: notice.content,
          category: notice.category,
          publishedAt: notice.publishedAt,
        });
      }
    }
  }

  res.status(200).json({
    success: true,
    data: {
      notices: publicNotices.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)),
    },
  });
});
