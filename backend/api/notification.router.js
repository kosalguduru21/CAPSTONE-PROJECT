import express from "express";
import { NotificationModel } from "../models/notification.model.js";
import { authenticateSession } from "../middlewares/auth.middleware.js";

export const notificationRouter = express.Router();

notificationRouter.use(authenticateSession);

/**
 * GET /api/notifications
 */
notificationRouter.get("/", async (req, res) => {
  const notifications = await NotificationModel.find({ recipientId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const unreadCount = await NotificationModel.countDocuments({
    recipientId: req.user._id,
    isRead: false,
  });

  res.status(200).json({
    success: true,
    data: {
      notifications,
      unreadCount,
    },
  });
});

/**
 * PATCH /api/notifications/:id/read
 */
notificationRouter.patch("/:id/read", async (req, res) => {
  const { id } = req.params;

  await NotificationModel.updateOne(
    { _id: id, recipientId: req.user._id },
    { isRead: true },
  );

  res.status(200).json({
    success: true,
    message: "Notification marked as read.",
  });
});

/**
 * POST /api/notifications/mark-all-read
 */
notificationRouter.post("/mark-all-read", async (req, res) => {
  await NotificationModel.updateMany(
    { recipientId: req.user._id, isRead: false },
    { isRead: true },
  );

  res.status(200).json({
    success: true,
    message: "All notifications marked as read.",
  });
});
