import request from "supertest";
import app from "../src/app.js";
import Service from "../src/models/serviceModel.js";
import {
  createTestUser,
  createTestAdmin,
  generateTestToken,
  getAuthHeaders,
  cleanupTestData,
} from "./helpers/testHelpers.js";

describe("Service API_ENDPOINTS", () => {
  let admin, adminToken;
  let user, userToken;
  let testServices;

  beforeEach(async () => {
    await cleanupTestData();

    // Create test users
    admin = await createTestAdmin();
    user = await createTestUser();

    // Generate tokens
    adminToken = generateTestToken(admin._id, "admin");
    userToken = generateTestToken(user._id, "customer");

    // Create test services
    testServices = await Service.insertMany([
      {
        name: "Plumbing Repair",
        description: "Professional plumbing repair service",
        category: "plumbing",
        price: 150,
        duration: 120,
        isActive: true,
        featured: true,
      },
      {
        name: "Electrical Installation",
        description: "Electrical installation service",
        category: "electrical",
        price: 200,
        duration: 180,
        isActive: true,
        featured: false,
      },
      {
        name: "Inactive Service",
        description: "This service is not active",
        category: "other",
        price: 100,
        duration: 60,
        isActive: false,
      },
    ]);
  });

  describe("Public Routes", () => {
    describe("GET /api/services", () => {
      test("should get all active services", async () => {
        const response = await request(app).get("/api/services").expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.services)).toBe(true);
        // Should only return active services
        response.body.data.services.forEach((service) => {
          expect(service.isActive).toBe(true);
        });
      });

      test("should support pagination", async () => {
        const response = await request(app)
          .get("/api/services?page=1&limit=2")
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty("pagination");
      });

      test("should filter by category", async () => {
        const response = await request(app)
          .get("/api/services?category=plumbing")
          .expect(200);

        expect(response.body.success).toBe(true);
        response.body.data.services.forEach((service) => {
          expect(service.category).toBe("plumbing");
        });
      });
    });

    describe("GET /api/services/popular", () => {
      test("should get popular services", async () => {
        const response = await request(app)
          .get("/api/services/popular")
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.services)).toBe(true);
      });
    });

    describe("GET /api/services/top-services", () => {
      test("should get top services", async () => {
        const response = await request(app)
          .get("/api/services/top-services")
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.services)).toBe(true);
      });
    });

    describe("GET /api/services/categories", () => {
      test("should get service categories", async () => {
        const response = await request(app)
          .get("/api/services/categories")
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.categories)).toBe(true);
      });
    });

    describe("GET /api/services/categories/:category", () => {
      test("should get services by category", async () => {
        const response = await request(app)
          .get("/api/services/categories/plumbing")
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.services)).toBe(true);
      });
    });

    describe("GET /api/services/search", () => {
      test("should search services by name", async () => {
        const response = await request(app)
          .get("/api/services/search?q=plumbing")
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.services)).toBe(true);
      });

      test("should search services by description", async () => {
        const response = await request(app)
          .get("/api/services/search?q=repair")
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      test("should handle empty search query", async () => {
        const response = await request(app)
          .get("/api/services/search")
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe("GET /api/services/:id", () => {
      test("should get service by ID", async () => {
        const service = testServices[0];

        const response = await request(app)
          .get(`/api/services/${service._id}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.service.id).toBe(service._id.toString());
      });

      test("should return 404 for non-existent service", async () => {
        const fakeId = "60d5ecb74844e5a3d4f6d789";

        const response = await request(app)
          .get(`/api/services/${fakeId}`)
          .expect(404);

        expect(response.body.success).toBe(false);
      });

      test("should return 404 for inactive service", async () => {
        const inactiveService = testServices[2]; // Inactive service

        const response = await request(app)
          .get(`/api/services/${inactiveService._id}`)
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe("Admin Routes", () => {
    describe("POST /api/services", () => {
      test("should create new service as admin", async () => {
        const serviceData = {
          name: "New Service",
          description: "New service description",
          category: "cleaning",
          price: 120,
          duration: 90,
          isActive: true,
        };

        const response = await request(app)
          .post("/api/services")
          .set(getAuthHeaders(adminToken))
          .send(serviceData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.service.name).toBe(serviceData.name);
      });

      test("should reject service creation by non-admin", async () => {
        const serviceData = {
          name: "Unauthorized Service",
          category: "test",
          price: 100,
        };

        const response = await request(app)
          .post("/api/services")
          .set(getAuthHeaders(userToken))
          .send(serviceData)
          .expect(403);

        expect(response.body.success).toBe(false);
      });

      test("should validate required fields", async () => {
        const response = await request(app)
          .post("/api/services")
          .set(getAuthHeaders(adminToken))
          .send({ name: "Incomplete Service" })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe("PATCH /api/services/:id", () => {
      test("should update service as admin", async () => {
        const service = testServices[0];
        const updateData = {
          name: "Updated Service Name",
          price: 180,
        };

        const response = await request(app)
          .patch(`/api/services/${service._id}`)
          .set(getAuthHeaders(adminToken))
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.service.name).toBe(updateData.name);
        expect(response.body.data.service.price).toBe(updateData.price);
      });

      test("should reject update by non-admin", async () => {
        const service = testServices[0];

        const response = await request(app)
          .patch(`/api/services/${service._id}`)
          .set(getAuthHeaders(userToken))
          .send({ name: "Unauthorized Update" })
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });

    describe("DELETE /api/services/:id", () => {
      test("should delete service as admin", async () => {
        const service = testServices[0];

        const response = await request(app)
          .delete(`/api/services/${service._id}`)
          .set(getAuthHeaders(adminToken))
          .expect(200);

        expect(response.body.success).toBe(true);

        // Verify service is deleted or marked inactive
        const deletedService = await Service.findById(service._id);
        expect(
          deletedService === null || deletedService.isActive === false
        ).toBe(true);
      });

      test("should reject deletion by non-admin", async () => {
        const service = testServices[0];

        const response = await request(app)
          .delete(`/api/services/${service._id}`)
          .set(getAuthHeaders(userToken))
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });

    describe("GET /api/services/stats", () => {
      test("should get service statistics as admin", async () => {
        const response = await request(app)
          .get("/api/services/stats")
          .set(getAuthHeaders(adminToken))
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty("stats");
      });

      test("should reject stats access by non-admin", async () => {
        const response = await request(app)
          .get("/api/services/stats")
          .set(getAuthHeaders(userToken))
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe("Caching", () => {
    test("should return cached response for repeated requests", async () => {
      // First request
      const response1 = await request(app).get("/api/services").expect(200);

      // Second request (should be cached)
      const response2 = await request(app).get("/api/services").expect(200);

      expect(response1.body).toEqual(response2.body);
    });
  });

  describe("Error Handling", () => {
    test("should handle invalid ObjectId in URL params", async () => {
      const response = await request(app)
        .get("/api/services/invalid-id")
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test("should handle database errors gracefully", async () => {
      // Simulate database error by using invalid query
      const response = await request(app)
        .get("/api/services?category[$ne]=")
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe("Unauthorized Access", () => {
    test("should allow public access to public routes", async () => {
      const response = await request(app).get("/api/services").expect(200);

      expect(response.body.success).toBe(true);
    });

    test("should reject admin routes without token", async () => {
      const response = await request(app)
        .post("/api/services")
        .send({ name: "Test" })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
