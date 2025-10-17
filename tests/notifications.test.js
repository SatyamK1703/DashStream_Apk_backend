import request from "supertest";
import app from "../src/app.js";
import Notification from "../src/models/notificationModel.js";
import DeviceToken from "../src/models/deviceTokenModel.js";
import {
  createTestUser,
  createTestAdmin,
  generateTestToken,
  getAuthHeaders,
  cleanupTestData,
} from "./helpers/testHelpers.js";

describe("Notification API_ENDPOINTS", () => {
  let user, otherUser, admin;
  let userToken, otherUserToken, adminToken;
  let testNotifications;

  beforeEach(async () => {
    await cleanupTestData();

    // Create test users
    user = await createTestUser();
    otherUser = await createTestUser({
      phone: "+1234567899",
      email: "other@example.com",
    });
    admin = await createTestAdmin();

    // Generate tokens
    userToken = generateTestToken(user._id, "customer");
    otherUserToken = generateTestToken(otherUser._id, "customer");
    adminToken = generateTestToken(admin._id, "admin");

    // Create test notifications
    testNotifications = await Notification.insertMany([
      {
        user: user._id,
        title: "Booking Confirmed",
        message: "Your booking has been confirmed",
        type: "booking",
        read: false,
        createdAt: new Date(),
        data: { bookingId: "booking123" },
      },
      {
        user: user._id,
        title: "Payment Successful",
        message: "Your payment has been processed",
        type: "payment",
        read: true,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        data: { paymentId: "payment123" },
      },
      {
        user: otherUser._id,
        title: "Other User Notification",
        message: "This notification belongs to another user",
        type: "general",
        read: false,
        createdAt: new Date(),
      },
    ]);
  });

  describe("GET /api/notifications", () => {
    test("should get user notifications", async () => {
      const response = await request(app)
        .get("/api/notifications")
        .set(getAuthHeaders(userToken))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.notifications)).toBe(true);

      // Should only return current user's notifications
      response.body.data.notifications.forEach((notification) => {
        expect(notification.user).toBe(user._id.toString());
      });
    });

    test("should support pagination", async () => {
      const response = await request(app)
        .get("/api/notifications?page=1&limit=1")
        .set(getAuthHeaders(userToken))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("pagination");
      expect(response.body.data.notifications.length).toBeLessThanOrEqual(1);
    });

    test("should filter by read status", async () => {
      const response = await request(app)
        .get("/api/notifications?read=false")
        .set(getAuthHeaders(userToken))
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.notifications.forEach((notification) => {
        expect(notification.read).toBe(false);
      });
    });

    test("should filter by type", async () => {
      const response = await request(app)
        .get("/api/notifications?type=booking")
        .set(getAuthHeaders(userToken))
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.notifications.forEach((notification) => {
        expect(notification.type).toBe("booking");
      });
    });

    test("should sort by creation date", async () => {
      const response = await request(app)
        .get("/api/notifications?sort=-createdAt")
        .set(getAuthHeaders(userToken))
        .expect(200);

      expect(response.body.success).toBe(true);
      const notifications = response.body.data.notifications;

      if (notifications.length > 1) {
        for (let i = 1; i < notifications.length; i++) {
          expect(
            new Date(notifications[i - 1].createdAt) >=
              new Date(notifications[i].createdAt)
          ).toBe(true);
        }
      }
    });
  });

  describe("GET /api/notifications/unread-count", () => {
    test("should get unread notification count", async () => {
      const response = await request(app)
        .get("/api/notifications/unread-count")
        .set(getAuthHeaders(userToken))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(typeof response.body.data.unreadCount).toBe("number");
      expect(response.body.data.unreadCount).toBeGreaterThan(0);
    });

    test("should return 0 for user with no unread notifications", async () => {
      // Mark all notifications as read
      await Notification.updateMany({ user: user._id }, { read: true });

      const response = await request(app)
        .get("/api/notifications/unread-count")
        .set(getAuthHeaders(userToken))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.unreadCount).toBe(0);
    });
  });

  describe("PATCH /api/notifications/mark-all-read", () => {
    test("should mark all notifications as read", async () => {
      const response = await request(app)
        .patch("/api/notifications/mark-all-read")
        .set(getAuthHeaders(userToken))
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify all notifications are marked as read
      const unreadCount = await Notification.countDocuments({
        user: user._id,
        read: false,
      });
      expect(unreadCount).toBe(0);
    });

    test("should only affect current user notifications", async () => {
      await request(app)
        .patch("/api/notifications/mark-all-read")
        .set(getAuthHeaders(userToken));

      // Check that other user's notifications are unaffected
      const otherUserUnreadCount = await Notification.countDocuments({
        user: otherUser._id,
        read: false,
      });
      expect(otherUserUnreadCount).toBeGreaterThan(0);
    });
  });

  describe("DELETE /api/notifications/delete-read", () => {
    test("should delete all read notifications", async () => {
      const response = await request(app)
        .delete("/api/notifications/delete-read")
        .set(getAuthHeaders(userToken))
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify read notifications are deleted
      const readNotifications = await Notification.find({
        user: user._id,
        read: true,
      });
      expect(readNotifications.length).toBe(0);

      // Verify unread notifications remain
      const unreadNotifications = await Notification.find({
        user: user._id,
        read: false,
      });
      expect(unreadNotifications.length).toBeGreaterThan(0);
    });
  });

  describe("PATCH /api/notifications/:id/read", () => {
    test("should mark specific notification as read", async () => {
      const notification = testNotifications[0]; // Unread notification

      const response = await request(app)
        .patch(`/api/notifications/${notification._id}/read`)
        .set(getAuthHeaders(userToken))
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify notification is marked as read
      const updatedNotification = await Notification.findById(notification._id);
      expect(updatedNotification.read).toBe(true);
    });

    test("should reject marking other user notification", async () => {
      const otherUserNotification = testNotifications[2];

      const response = await request(app)
        .patch(`/api/notifications/${otherUserNotification._id}/read`)
        .set(getAuthHeaders(userToken))
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    test("should handle non-existent notification", async () => {
      const fakeId = "60d5ecb74844e5a3d4f6d789";

      const response = await request(app)
        .patch(`/api/notifications/${fakeId}/read`)
        .set(getAuthHeaders(userToken))
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe("DELETE /api/notifications/:id", () => {
    test("should delete specific notification", async () => {
      const notification = testNotifications[0];

      const response = await request(app)
        .delete(`/api/notifications/${notification._id}`)
        .set(getAuthHeaders(userToken))
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify notification is deleted
      const deletedNotification = await Notification.findById(notification._id);
      expect(deletedNotification).toBeNull();
    });

    test("should reject deleting other user notification", async () => {
      const otherUserNotification = testNotifications[2];

      const response = await request(app)
        .delete(`/api/notifications/${otherUserNotification._id}`)
        .set(getAuthHeaders(userToken))
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe("Device Token Management", () => {
    describe("POST /api/notifications/register-device", () => {
      test("should register device token", async () => {
        const deviceData = {
          token: "test_firebase_token_123",
          platform: "android",
          deviceId: "device_123",
          appVersion: "1.0.0",
        };

        const response = await request(app)
          .post("/api/notifications/register-device")
          .set(getAuthHeaders(userToken))
          .send(deviceData)
          .expect(200);

        expect(response.body.success).toBe(true);

        // Verify device token is saved
        const savedToken = await DeviceToken.findOne({
          user: user._id,
          token: deviceData.token,
        });
        expect(savedToken).toBeTruthy();
        expect(savedToken.platform).toBe(deviceData.platform);
      });

      test("should update existing device token", async () => {
        const deviceData = {
          token: "test_firebase_token_123",
          platform: "android",
          deviceId: "device_123",
          appVersion: "1.0.0",
        };

        // Register token first time
        await request(app)
          .post("/api/notifications/register-device")
          .set(getAuthHeaders(userToken))
          .send(deviceData);

        // Register again with updated app version
        const updatedData = { ...deviceData, appVersion: "1.1.0" };

        const response = await request(app)
          .post("/api/notifications/register-device")
          .set(getAuthHeaders(userToken))
          .send(updatedData)
          .expect(200);

        expect(response.body.success).toBe(true);

        // Verify only one token exists with updated version
        const tokens = await DeviceToken.find({
          user: user._id,
          token: deviceData.token,
        });
        expect(tokens.length).toBe(1);
        expect(tokens[0].appVersion).toBe("1.1.0");
      });

      test("should validate required device token fields", async () => {
        const response = await request(app)
          .post("/api/notifications/register-device")
          .set(getAuthHeaders(userToken))
          .send({ platform: "android" })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe("DELETE /api/notifications/deregister-device", () => {
      beforeEach(async () => {
        await DeviceToken.create({
          user: user._id,
          token: "test_token_to_delete",
          platform: "ios",
          deviceId: "device_456",
        });
      });

      test("should deregister device token", async () => {
        const response = await request(app)
          .delete("/api/notifications/deregister-device")
          .set(getAuthHeaders(userToken))
          .send({ token: "test_token_to_delete" })
          .expect(200);

        expect(response.body.success).toBe(true);

        // Verify token is deleted
        const deletedToken = await DeviceToken.findOne({
          user: user._id,
          token: "test_token_to_delete",
        });
        expect(deletedToken).toBeNull();
      });

      test("should handle non-existent token", async () => {
        const response = await request(app)
          .delete("/api/notifications/deregister-device")
          .set(getAuthHeaders(userToken))
          .send({ token: "non_existent_token" })
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });

    describe("GET /api/notifications/my-devices", () => {
      beforeEach(async () => {
        await DeviceToken.insertMany([
          {
            user: user._id,
            token: "android_token_1",
            platform: "android",
            deviceId: "android_device_1",
          },
          {
            user: user._id,
            token: "ios_token_1",
            platform: "ios",
            deviceId: "ios_device_1",
          },
          {
            user: otherUser._id,
            token: "other_user_token",
            platform: "android",
            deviceId: "other_device",
          },
        ]);
      });

      test("should get user device tokens", async () => {
        const response = await request(app)
          .get("/api/notifications/my-devices")
          .set(getAuthHeaders(userToken))
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.devices)).toBe(true);
        expect(response.body.data.devices.length).toBe(2);

        // Should only return current user's devices
        response.body.data.devices.forEach((device) => {
          expect(device.user).toBe(user._id.toString());
        });
      });

      test("should filter by platform", async () => {
        const response = await request(app)
          .get("/api/notifications/my-devices?platform=android")
          .set(getAuthHeaders(userToken))
          .expect(200);

        expect(response.body.success).toBe(true);
        response.body.data.devices.forEach((device) => {
          expect(device.platform).toBe("android");
        });
      });
    });

    describe("DELETE /api/notifications/cleanup-old-tokens", () => {
      test("should clean up old device tokens", async () => {
        // Create old token (older than 30 days)
        await DeviceToken.create({
          user: user._id,
          token: "old_token",
          platform: "android",
          deviceId: "old_device",
          lastUsed: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
        });

        const response = await request(app)
          .delete("/api/notifications/cleanup-old-tokens")
          .set(getAuthHeaders(adminToken))
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.deletedCount).toBeGreaterThan(0);
      });

      test("should reject cleanup by non-admin", async () => {
        const response = await request(app)
          .delete("/api/notifications/cleanup-old-tokens")
          .set(getAuthHeaders(userToken))
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe("Admin Routes", () => {
    describe("POST /api/notifications/create", () => {
      test("should create notification as admin", async () => {
        const notificationData = {
          user: user._id,
          title: "Admin Notification",
          message: "This is a notification from admin",
          type: "admin",
        };

        const response = await request(app)
          .post("/api/notifications/create")
          .set(getAuthHeaders(adminToken))
          .send(notificationData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.notification.title).toBe(
          notificationData.title
        );
      });

      test("should create broadcast notification", async () => {
        const broadcastData = {
          title: "System Maintenance",
          message: "Scheduled maintenance tonight",
          type: "system",
          broadcast: true,
        };

        const response = await request(app)
          .post("/api/notifications/create")
          .set(getAuthHeaders(adminToken))
          .send(broadcastData)
          .expect(201);

        expect(response.body.success).toBe(true);
      });

      test("should reject notification creation by non-admin", async () => {
        const notificationData = {
          user: user._id,
          title: "Unauthorized Notification",
          message: "This should not be created",
        };

        const response = await request(app)
          .post("/api/notifications/create")
          .set(getAuthHeaders(userToken))
          .send(notificationData)
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });

    describe("DELETE /api/notifications/delete-expired", () => {
      test("should delete expired notifications", async () => {
        // Create expired notification
        await Notification.create({
          user: user._id,
          title: "Expired Notification",
          message: "This notification is old",
          type: "general",
          createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
          expiresAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // Expired 5 days ago
        });

        const response = await request(app)
          .delete("/api/notifications/delete-expired")
          .set(getAuthHeaders(adminToken))
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });
  });

  describe("Error Handling", () => {
    test("should handle invalid ObjectId in URL params", async () => {
      const response = await request(app)
        .patch("/api/notifications/invalid-id/read")
        .set(getAuthHeaders(userToken))
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test("should handle notification service failures", async () => {
      // This test would mock Firebase messaging service failure
      // In real implementation, you'd mock the Firebase admin SDK
      const deviceData = {
        token: "invalid_firebase_token",
        platform: "android",
        deviceId: "device_123",
      };

      // The response should still be successful even if FCM fails
      const response = await request(app)
        .post("/api/notifications/register-device")
        .set(getAuthHeaders(userToken))
        .send(deviceData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe("Unauthorized Access", () => {
    test("should reject requests without token", async () => {
      const response = await request(app).get("/api/notifications").expect(401);

      expect(response.body.success).toBe(false);
    });

    test("should reject requests with invalid token", async () => {
      const response = await request(app)
        .get("/api/notifications")
        .set(getAuthHeaders("invalid-token"))
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
