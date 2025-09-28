import request from "supertest";
import app from "../src/app.js";
import User from "../src/models/userModel.js";
import {
  createTestUser,
  createTestProfessional,
  createTestAdmin,
  generateTestToken,
  getAuthHeaders,
  generateTestEmail,
  cleanupTestData,
} from "./helpers/testHelpers.js";

describe("User Endpoints", () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  describe("Protected User Routes", () => {
    let user, token;

    beforeEach(async () => {
      user = await createTestUser();
      token = generateTestToken(user._id);
    });

    describe("GET /api/users/me", () => {
      test("should get current user profile", async () => {
        const response = await request(app)
          .get("/api/users/me")
          .set(getAuthHeaders(token))
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.id).toBe(user._id.toString());
      });
    });

    describe("PATCH /api/users/update-profile", () => {
      test("should update user profile", async () => {
        const updateData = {
          name: "Updated Name",
          email: generateTestEmail(),
        };

        const response = await request(app)
          .patch("/api/users/update-profile")
          .set(getAuthHeaders(token))
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.name).toBe(updateData.name);
      });

      test("should validate email format", async () => {
        const response = await request(app)
          .patch("/api/users/update-profile")
          .set(getAuthHeaders(token))
          .send({ email: "invalid-email" })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe("PATCH /api/users/update-profile-image", () => {
      test("should update profile image", async () => {
        const response = await request(app)
          .patch("/api/users/update-profile-image")
          .set(getAuthHeaders(token))
          .attach("profileImage", Buffer.from("fake-image"), "test.jpg")
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe("DELETE /api/users/delete-account", () => {
      test("should delete user account", async () => {
        const response = await request(app)
          .delete("/api/users/delete-account")
          .set(getAuthHeaders(token))
          .expect(200);

        expect(response.body.success).toBe(true);

        // Verify user is deleted
        const deletedUser = await User.findById(user._id);
        expect(deletedUser).toBeNull();
      });
    });
  });

  describe("Address Management", () => {
    let user, token;

    beforeEach(async () => {
      user = await createTestUser();
      token = generateTestToken(user._id);
    });

    describe("POST /api/users/addresses", () => {
      test("should create new address", async () => {
        const addressData = {
          label: "Home",
          street: "123 Test St",
          city: "Test City",
          state: "Test State",
          zipCode: "12345",
          coordinates: { lat: 40.7128, lng: -74.006 },
        };

        const response = await request(app)
          .post("/api/users/addresses")
          .set(getAuthHeaders(token))
          .send(addressData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.address.label).toBe(addressData.label);
      });

      test("should validate required address fields", async () => {
        const response = await request(app)
          .post("/api/users/addresses")
          .set(getAuthHeaders(token))
          .send({ label: "Home" })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe("GET /api/users/addresses", () => {
      test("should get user addresses", async () => {
        const response = await request(app)
          .get("/api/users/addresses")
          .set(getAuthHeaders(token))
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.addresses)).toBe(true);
      });
    });
  });

  describe("Professional Routes", () => {
    let professional, token;

    beforeEach(async () => {
      professional = await createTestProfessional();
      token = generateTestToken(professional._id, "professional");
    });

    describe("PATCH /api/users/professional-profile", () => {
      test("should update professional profile", async () => {
        const updateData = {
          skills: ["plumbing", "electrical"],
          experience: 10,
          hourlyRate: 50,
        };

        const response = await request(app)
          .patch("/api/users/professional-profile")
          .set(getAuthHeaders(token))
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe("PATCH /api/users/toggle-availability", () => {
      test("should toggle professional availability", async () => {
        const response = await request(app)
          .patch("/api/users/toggle-availability")
          .set(getAuthHeaders(token))
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });
  });

  describe("Customer Routes", () => {
    let user, token;

    beforeEach(async () => {
      user = await createTestUser();
      token = generateTestToken(user._id, "customer");
    });

    describe("GET /api/users/professionals", () => {
      test("should get list of professionals", async () => {
        await createTestProfessional();

        const response = await request(app)
          .get("/api/users/professionals")
          .set(getAuthHeaders(token))
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.professionals)).toBe(true);
      });

      test("should filter professionals by skill", async () => {
        const response = await request(app)
          .get("/api/users/professionals?skill=plumbing")
          .set(getAuthHeaders(token))
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe("GET /api/users/professionals/:id", () => {
      test("should get professional details", async () => {
        const professional = await createTestProfessional();

        const response = await request(app)
          .get(`/api/users/professionals/${professional._id}`)
          .set(getAuthHeaders(token))
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.professional.id).toBe(
          professional._id.toString()
        );
      });
    });
  });

  describe("Admin Routes", () => {
    let admin, token;

    beforeEach(async () => {
      admin = await createTestAdmin();
      token = generateTestToken(admin._id, "admin");
    });

    describe("GET /api/users", () => {
      test("should get all users", async () => {
        await createTestUser();
        await createTestProfessional();

        const response = await request(app)
          .get("/api/users")
          .set(getAuthHeaders(token))
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.users)).toBe(true);
        expect(response.body.data.users.length).toBeGreaterThan(0);
      });

      test("should reject non-admin access", async () => {
        const user = await createTestUser();
        const userToken = generateTestToken(user._id, "customer");

        const response = await request(app)
          .get("/api/users")
          .set(getAuthHeaders(userToken))
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });

    describe("POST /api/users", () => {
      test("should create new user", async () => {
        const userData = {
          name: "Admin Created User",
          phone: "+1234567899",
          email: generateTestEmail(),
          role: "customer",
        };

        const response = await request(app)
          .post("/api/users")
          .set(getAuthHeaders(token))
          .send(userData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.name).toBe(userData.name);
      });
    });

    describe("GET /api/users/:id", () => {
      test("should get specific user", async () => {
        const user = await createTestUser();

        const response = await request(app)
          .get(`/api/users/${user._id}`)
          .set(getAuthHeaders(token))
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.id).toBe(user._id.toString());
      });
    });

    describe("PATCH /api/users/:id", () => {
      test("should update specific user", async () => {
        const user = await createTestUser();
        const updateData = { name: "Admin Updated Name" };

        const response = await request(app)
          .patch(`/api/users/${user._id}`)
          .set(getAuthHeaders(token))
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.name).toBe(updateData.name);
      });
    });

    describe("DELETE /api/users/:id", () => {
      test("should delete specific user", async () => {
        const user = await createTestUser();

        const response = await request(app)
          .delete(`/api/users/${user._id}`)
          .set(getAuthHeaders(token))
          .expect(200);

        expect(response.body.success).toBe(true);

        // Verify user is deleted
        const deletedUser = await User.findById(user._id);
        expect(deletedUser).toBeNull();
      });
    });

    describe("GET /api/users/stats", () => {
      test("should get user statistics", async () => {
        const response = await request(app)
          .get("/api/users/stats")
          .set(getAuthHeaders(token))
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty("stats");
      });
    });
  });

  describe("Unauthorized Access", () => {
    test("should reject requests without token", async () => {
      const response = await request(app).get("/api/users/me").expect(401);

      expect(response.body.success).toBe(false);
    });

    test("should reject requests with invalid token", async () => {
      const response = await request(app)
        .get("/api/users/me")
        .set(getAuthHeaders("invalid-token"))
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
