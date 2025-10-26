import express from "express";
import {
  getAllNotifications,
  getUnreadCount,
  markAllAsRead,
  deleteReadNotifications,
  markAsRead,
  deleteNotification,
  createNotification,
  deleteExpiredNotifications,
  getMyNotifications,
  getPreferences,
  updatePreferences,
  createAreaRequestNotification,
} from "../controllers/notificationController.js";
import {
  registerDeviceToken,
  deregisterDeviceToken,
  getMyDevices,
  cleanupOldTokens,
} from "../controllers/deviceTokenController.js";
import { protect, restrictTo } from "../middleware/auth.js";

const router = express.Router();

// Protect all routes after this middleware
router.use(protect);

// Routes for all authenticated users
router.get("/", getMyNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/read-all", markAllAsRead);
router.delete("/delete-read", deleteReadNotifications);

// Allow authenticated users to GET /PATCH their own notification preferences
router.get("/preferences", getPreferences);
router.patch("/preferences", updatePreferences);

router.patch("/:id/read", markAsRead);
router.delete("/:id", deleteNotification);

// Route for customer to request a new service area
router.post("/area-request", createAreaRequestNotification);

// Device token routes
router.post("/register-device", registerDeviceToken);
router.delete("/deregister-device", deregisterDeviceToken);
router.get("/my-devices", getMyDevices);

// Admin only routes
router.use(restrictTo("admin"));

router.post("/", createNotification);
router.get("/all", getAllNotifications);
router.delete("/expired", deleteExpiredNotifications);
router.delete("/cleanup-tokens", cleanupOldTokens);

export default router;
