import request from "supertest";
import app from "../src/server.js";
import User from "../src/models/userModel.js";
import Booking from "../src/models/bookingModel.js";
import Service from "../src/models/serviceModel.js";
import {
  createTestUser,
  createTestProfessional,
  createTestAdmin,
  generateTestToken,
  getAuthHeaders,
  cleanupTestData,
  generateTestEmail,
} from "./helpers/testHelpers.js";

describe("Admin Endpoints", () => {
  let admin, user, professional;
  let adminToken, userToken;
  let testService, testBooking;

  beforeEach(async () => {
    await cleanupTestData();

    // Create test users
    admin = await createTestAdmin();
    user = await createTestUser();
    professional = await createTestProfessional();

    // Generate tokens
    adminToken = generateTestToken(admin._id, "admin");
    userToken = generateTestToken(user._id, "customer");

    // Create test service
    testService = await Service.create({
      name: "Test Service",
      description: "Test service for admin tests",
      category: "plumbing",
      price: 150,
      duration: 120,
      isActive: true,
    });

    // Create test booking
    testBooking = await Booking.create({
      customer: user._id,
      service: testService._id,
      professional: professional._id,
      scheduledDate: new Date(),
      address: {
        street: "123 Test St",
        city: "Test City",
        state: "Test State",
        zipCode: "12345",
      },
      status: "pending",
      totalAmount: 150,
    });
  });

  describe("Dashboard Routes", () => {
    describe("GET /api/admins/dashboard", () => {
      test("should get dashboard statistics as admin", async () => {
        const response = await request(app)
          .get("/api/admins/dashboard")
          .set(getAuthHeaders(adminToken))
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty("stats");
        expect(response.body.data.stats).toHaveProperty("totalUsers");
        expect(response.body.data.stats).toHaveProperty("totalBookings");
        expect(response.body.data.stats).toHaveProperty("totalRevenue");
        expect(response.body.data.stats).toHaveProperty("activeServices");
      });

      test("should include time-based analytics", async () => {
        const response = await request(app)
          .get("/api/admins/dashboard?period=7d")
          .set(getAuthHeaders(adminToken))
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.stats).toHaveProperty("periodComparison");
      });

      test("should reject access by non-admin", async () => {
        const response = await request(app)
          .get("/api/admins/dashboard")
          .set(getAuthHeaders(userToken))
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe("User Management", () => {
    describe("GET /api/admins/users", () => {
      test("should get all users as admin", async () => {
        const response = await request(app)
          .get("/api/admins/users")
          .set(getAuthHeaders(adminToken))
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.users)).toBe(true);
        expect(response.body.data.users.length).toBeGreaterThan(0);
      });

      test("should support user filtering", async () => {
        const response = await request(app)
          .get("/api/admins/users?role=professional")
          .set(getAuthHeaders(adminToken))
          .expect(200);

        expect(response.body.success).toBe(true);
        response.body.data.users.forEach((user) => {
          expect(user.role).toBe("professional");
        });
      });

      test("should support search functionality", async () => {
        const response = await request(app)
          .get(`/api/admins/users?search=${user.name}`)
          .set(getAuthHeaders(adminToken))
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(
          response.body.data.users.some((u) => u.name.includes(user.name))
        ).toBe(true);
      });

      test("should support pagination", async () => {
        const response = await request(app)
          .get("/api/admins/users?page=1&limit=2")
          .set(getAuthHeaders(adminToken))
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty("pagination");
        expect(response.body.data.users.length).toBeLessThanOrEqual(2);
      });
    });

    describe("POST /api/admins/users", () => {
      test("should create new user as admin", async () => {
        const userData = {
          name: "Admin Created User",
          email: generateTestEmail(),
          phone: "+1234567893",
          role: "customer",
          isPhoneVerified: true,
        };

        const response = await request(app)
          .post("/api/admins/users")
          .set(getAuthHeaders(adminToken))
          .send(userData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.name).toBe(userData.name);
        expect(response.body.data.user.email).toBe(userData.email);
      });

      test("should create professional user with profile", async () => {
        const professionalData = {
          name: "New Professional",
          email: generateTestEmail(),
          phone: "+1234567894",
          role: "professional",
          isPhoneVerified: true,
          professionalProfile: {
            skills: ["electrical"],
            experience: 5,
            hourlyRate: 75,
            available: true,
          },
        };

        const response = await request(app)
          .post("/api/admins/users")
          .set(getAuthHeaders(adminToken))
          .send(professionalData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.role).toBe("professional");
      });

      test("should validate unique phone number", async () => {
        const userData = {
          name: "Duplicate Phone User",
          email: generateTestEmail(),
          phone: user.phone, // Existing phone
          role: "customer",
        };

        const response = await request(app)
          .post("/api/admins/users")
          .set(getAuthHeaders(adminToken))
          .send(userData)
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      test("should validate required fields", async () => {
        const response = await request(app)
          .post("/api/admins/users")
          .set(getAuthHeaders(adminToken))
          .send({ name: "Incomplete User" })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe("GET /api/admins/users/:userId", () => {
      test("should get specific user details", async () => {
        const response = await request(app)
          .get(`/api/admins/users/${user._id}`)
          .set(getAuthHeaders(adminToken))
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.id).toBe(user._id.toString());
        expect(response.body.data.user.name).toBe(user.name);
      });

      test("should include additional user analytics", async () => {
        const response = await request(app)
          .get(`/api/admins/users/${user._id}?includeStats=true`)
          .set(getAuthHeaders(adminToken))
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty("userStats");
      });

      test("should return 404 for non-existent user", async () => {
        const fakeId = "60d5ecb74844e5a3d4f6d789";

        const response = await request(app)
          .get(`/api/admins/users/${fakeId}`)
          .set(getAuthHeaders(adminToken))
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });

    describe("PATCH /api/admins/users/:userId", () => {
      test("should update user as admin", async () => {
        const updateData = {
          name: "Admin Updated Name",
          isPhoneVerified: true,
        };

        const response = await request(app)
          .patch(`/api/admins/users/${user._id}`)
          .set(getAuthHeaders(adminToken))
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.name).toBe(updateData.name);
        expect(response.body.data.user.isPhoneVerified).toBe(true);
      });

      test("should update user role", async () => {
        const response = await request(app)
          .patch(`/api/admins/users/${user._id}`)
          .set(getAuthHeaders(adminToken))
          .send({ role: "professional" })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.role).toBe("professional");
      });

      test("should validate email format when updating", async () => {
        const response = await request(app)
          .patch(`/api/admins/users/${user._id}`)
          .set(getAuthHeaders(adminToken))
          .send({ email: "invalid-email" })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe("DELETE /api/admins/users/:userId", () => {
      test("should delete user as admin", async () => {
        const response = await request(app)
          .delete(`/api/admins/users/${user._id}`)
          .set(getAuthHeaders(adminToken))
          .expect(200);

        expect(response.body.success).toBe(true);

        // Verify user is deleted
        const deletedUser = await User.findById(user._id);
        expect(deletedUser).toBeNull();
      });

      test("should handle user with active bookings", async () => {
        // User has active bookings, should soft delete or handle gracefully
        const response = await request(app)
          .delete(`/api/admins/users/${user._id}`)
          .set(getAuthHeaders(adminToken))
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      test("should prevent admin from deleting themselves", async () => {
        const response = await request(app)
          .delete(`/api/admins/users/${admin._id}`)
          .set(getAuthHeaders(adminToken))
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("cannot delete yourself");
      });
    });
  });

  describe("Booking Management", () => {
    describe("GET /api/admins/bookings", () => {
      test("should get all bookings as admin", async () => {
        const response = await request(app)
          .get("/api/admins/bookings")
          .set(getAuthHeaders(adminToken))
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.bookings)).toBe(true);
      });

      test("should filter bookings by status", async () => {
        const response = await request(app)
          .get("/api/admins/bookings?status=pending")
          .set(getAuthHeaders(adminToken))
          .expect(200);

        expect(response.body.success).toBe(true);
        response.body.data.bookings.forEach((booking) => {
          expect(booking.status).toBe("pending");
        });
      });

      test("should filter bookings by date range", async () => {
        const today = new Date().toISOString().split("T")[0];

        const response = await request(app)
          .get(`/api/admins/bookings?startDate=${today}&endDate=${today}`)
          .set(getAuthHeaders(adminToken))
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe("GET /api/admins/bookings/:bookingId", () => {
      test("should get booking details", async () => {
        const response = await request(app)
          .get(`/api/admins/bookings/${testBooking._id}`)
          .set(getAuthHeaders(adminToken))
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.booking.id).toBe(testBooking._id.toString());
      });

      test("should include related data", async () => {
        const response = await request(app)
          .get(`/api/admins/bookings/${testBooking._id}?populate=true`)
          .set(getAuthHeaders(adminToken))
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.booking).toHaveProperty("customer");
        expect(response.body.data.booking).toHaveProperty("service");
        expect(response.body.data.booking).toHaveProperty("professional");
      });
    });

    describe("PATCH /api/admins/bookings/:bookingId", () => {
      test("should update booking as admin", async () => {
        const updateData = {
          status: "confirmed",
          adminNotes: "Manually confirmed by admin",
        };

        const response = await request(app)
          .patch(`/api/admins/bookings/${testBooking._id}`)
          .set(getAuthHeaders(adminToken))
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.booking.status).toBe(updateData.status);
      });

      test("should reassign professional", async () => {
        const newProfessional = await createTestProfessional({
          phone: "+1234567895",
          email: "newpro@example.com",
        });

        const response = await request(app)
          .patch(`/api/admins/bookings/${testBooking._id}`)
          .set(getAuthHeaders(adminToken))
          .send({ professional: newProfessional._id })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.booking.professional).toBe(
          newProfessional._id.toString()
        );
      });
    });
  });

  describe("Service Management", () => {
    describe("GET /api/admins/services", () => {
      test("should get all services including inactive", async () => {
        // Create inactive service
        await Service.create({
          name: "Inactive Service",
          description: "This service is inactive",
          category: "test",
          price: 100,
          duration: 60,
          isActive: false,
        });

        const response = await request(app)
          .get("/api/admins/services")
          .set(getAuthHeaders(adminToken))
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.services)).toBe(true);

        // Should include inactive services
        const hasInactiveService = response.body.data.services.some(
          (service) => !service.isActive
        );
        expect(hasInactiveService).toBe(true);
      });
    });

    describe("POST /api/admins/services", () => {
      test("should create new service as admin", async () => {
        const serviceData = {
          name: "Admin Created Service",
          description: "Service created by admin",
          category: "cleaning",
          price: 200,
          duration: 180,
          isActive: true,
          featured: true,
        };

        const response = await request(app)
          .post("/api/admins/services")
          .set(getAuthHeaders(adminToken))
          .send(serviceData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.service.name).toBe(serviceData.name);
      });
    });

    describe("PATCH /api/admins/services/:serviceId", () => {
      test("should update service as admin", async () => {
        const updateData = {
          price: 180,
          isActive: false,
        };

        const response = await request(app)
          .patch(`/api/admins/services/${testService._id}`)
          .set(getAuthHeaders(adminToken))
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.service.price).toBe(updateData.price);
        expect(response.body.data.service.isActive).toBe(updateData.isActive);
      });
    });

    describe("DELETE /api/admins/services/:serviceId", () => {
      test("should delete service as admin", async () => {
        const response = await request(app)
          .delete(`/api/admins/services/${testService._id}`)
          .set(getAuthHeaders(adminToken))
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });
  });

  describe("Professional Management", () => {
    describe("GET /api/admins/professionals", () => {
      test("should get all professionals", async () => {
        const response = await request(app)
          .get("/api/admins/professionals")
          .set(getAuthHeaders(adminToken))
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.professionals)).toBe(true);
      });

      test("should filter by verification status", async () => {
        const response = await request(app)
          .get("/api/admins/professionals?verified=true")
          .set(getAuthHeaders(adminToken))
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      test("should filter by availability", async () => {
        const response = await request(app)
          .get("/api/admins/professionals?available=true")
          .set(getAuthHeaders(adminToken))
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe("GET /api/admins/professionals/:professionalId", () => {
      test("should get professional details", async () => {
        const response = await request(app)
          .get(`/api/admins/professionals/${professional._id}`)
          .set(getAuthHeaders(adminToken))
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.professional.id).toBe(
          professional._id.toString()
        );
      });

      test("should include professional statistics", async () => {
        const response = await request(app)
          .get(
            `/api/admins/professionals/${professional._id}?includeStats=true`
          )
          .set(getAuthHeaders(adminToken))
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty("professionalStats");
      });
    });

    describe("PATCH /api/admins/professionals/:professionalId", () => {
      test("should update professional profile", async () => {
        const updateData = {
          "professionalProfile.hourlyRate": 100,
          "professionalProfile.available": false,
        };

        const response = await request(app)
          .patch(`/api/admins/professionals/${professional._id}`)
          .set(getAuthHeaders(adminToken))
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe("PATCH /api/admins/professionals/:professionalId/verification", () => {
      test("should update professional verification status", async () => {
        const verificationData = {
          verified: true,
          verificationNotes: "Documents verified successfully",
          verifiedAt: new Date(),
          verifiedBy: admin._id,
        };

        const response = await request(app)
          .patch(`/api/admins/professionals/${professional._id}/verification`)
          .set(getAuthHeaders(adminToken))
          .send(verificationData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.professional.verified).toBe(true);
      });

      test("should reject verification", async () => {
        const rejectionData = {
          verified: false,
          verificationNotes: "Documents incomplete",
          rejectedAt: new Date(),
          rejectedBy: admin._id,
        };

        const response = await request(app)
          .patch(`/api/admins/professionals/${professional._id}/verification`)
          .set(getAuthHeaders(adminToken))
          .send(rejectionData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.professional.verified).toBe(false);
      });
    });
  });

  describe("Authorization", () => {
    test("should reject all admin routes without authentication", async () => {
      const response = await request(app)
        .get("/api/admins/dashboard")
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test("should reject admin routes from non-admin users", async () => {
      const response = await request(app)
        .get("/api/admins/dashboard")
        .set(getAuthHeaders(userToken))
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    test("should allow admin access to all routes", async () => {
      const routes = [
        "/api/admins/dashboard",
        "/api/admins/users",
        "/api/admins/bookings",
        "/api/admins/professionals",
      ];

      for (const route of routes) {
        const response = await request(app)
          .get(route)
          .set(getAuthHeaders(adminToken));

        expect(response.status).not.toBe(403);
      }
    });
  });

  describe("Error Handling", () => {
    test("should handle invalid ObjectId in URL params", async () => {
      const response = await request(app)
        .get("/api/admins/users/invalid-id")
        .set(getAuthHeaders(adminToken))
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test("should handle database constraint violations", async () => {
      // Try to create user with duplicate phone
      const userData = {
        name: "Duplicate User",
        email: generateTestEmail(),
        phone: user.phone, // Existing phone
        role: "customer",
      };

      const response = await request(app)
        .post("/api/admins/users")
        .set(getAuthHeaders(adminToken))
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
