import request from "supertest";
import app from "../src/app.js";
import Location from "../src/models/locationModel.js";
import {
  createTestUser,
  createTestAdmin,
  generateTestToken,
  getAuthHeaders,
  cleanupTestData,
} from "./helpers/testHelpers.js";

describe("Location Endpoints", () => {
  let user, admin;
  let userToken, adminToken;
  let testLocations;

  beforeEach(async () => {
    await cleanupTestData();

    // Create test users
    user = await createTestUser();
    admin = await createTestAdmin();

    // Generate tokens
    userToken = generateTestToken(user._id, "customer");
    adminToken = generateTestToken(admin._id, "admin");

    // Create test locations
    testLocations = await Location.insertMany([
      {
        name: "Downtown Area",
        type: "area",
        coordinates: { lat: 40.7128, lng: -74.006 },
        address: "Downtown Manhattan, NY",
        isActive: true,
        serviceRadius: 5,
        priority: 1,
      },
      {
        name: "Brooklyn Heights",
        type: "neighborhood",
        coordinates: { lat: 40.6962, lng: -73.9961 },
        address: "Brooklyn Heights, Brooklyn, NY",
        isActive: true,
        serviceRadius: 3,
        priority: 2,
      },
      {
        name: "Inactive Location",
        type: "area",
        coordinates: { lat: 40.7589, lng: -73.9851 },
        address: "Inactive Area, NY",
        isActive: false,
        serviceRadius: 2,
        priority: 3,
      },
    ]);
  });

  describe("GET /api/locations", () => {
    test("should get all active locations", async () => {
      const response = await request(app).get("/api/locations").expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.locations)).toBe(true);

      // Should only return active locations
      response.body.data.locations.forEach((location) => {
        expect(location.isActive).toBe(true);
      });
    });

    test("should filter locations by type", async () => {
      const response = await request(app)
        .get("/api/locations?type=area")
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.locations.forEach((location) => {
        expect(location.type).toBe("area");
      });
    });

    test("should support pagination", async () => {
      const response = await request(app)
        .get("/api/locations?page=1&limit=1")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("pagination");
      expect(response.body.data.locations.length).toBeLessThanOrEqual(1);
    });

    test("should sort locations by priority", async () => {
      const response = await request(app)
        .get("/api/locations?sort=priority")
        .expect(200);

      expect(response.body.success).toBe(true);
      const locations = response.body.data.locations;

      if (locations.length > 1) {
        for (let i = 1; i < locations.length; i++) {
          expect(locations[i].priority >= locations[i - 1].priority).toBe(true);
        }
      }
    });
  });

  describe("GET /api/locations/nearby", () => {
    test("should find nearby locations", async () => {
      const response = await request(app)
        .get("/api/locations/nearby?lat=40.7128&lng=-74.0060&radius=10")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.locations)).toBe(true);
    });

    test("should validate coordinate parameters", async () => {
      const response = await request(app)
        .get("/api/locations/nearby?lat=invalid&lng=-74.0060")
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test("should require all coordinate parameters", async () => {
      const response = await request(app)
        .get("/api/locations/nearby?lat=40.7128")
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test("should use default radius if not provided", async () => {
      const response = await request(app)
        .get("/api/locations/nearby?lat=40.7128&lng=-74.0060")
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe("GET /api/locations/search", () => {
    test("should search locations by name", async () => {
      const response = await request(app)
        .get("/api/locations/search?q=Downtown")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.locations)).toBe(true);
    });

    test("should search locations by address", async () => {
      const response = await request(app)
        .get("/api/locations/search?q=Brooklyn")
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test("should handle empty search query", async () => {
      const response = await request(app)
        .get("/api/locations/search")
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test("should return empty results for non-matching search", async () => {
      const response = await request(app)
        .get("/api/locations/search?q=NonExistentLocation")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.locations.length).toBe(0);
    });
  });

  describe("GET /api/locations/service-areas", () => {
    test("should get locations with service coverage", async () => {
      const response = await request(app)
        .get("/api/locations/service-areas")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.serviceAreas)).toBe(true);

      response.body.data.serviceAreas.forEach((area) => {
        expect(area).toHaveProperty("name");
        expect(area).toHaveProperty("coordinates");
        expect(area).toHaveProperty("serviceRadius");
      });
    });

    test("should include coverage information", async () => {
      const response = await request(app)
        .get("/api/locations/service-areas?includeCoverage=true")
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe("GET /api/locations/:id", () => {
    test("should get location by ID", async () => {
      const location = testLocations[0];

      const response = await request(app)
        .get(`/api/locations/${location._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.location.id).toBe(location._id.toString());
    });

    test("should return 404 for non-existent location", async () => {
      const fakeId = "60d5ecb74844e5a3d4f6d789";

      const response = await request(app)
        .get(`/api/locations/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test("should return 404 for inactive location", async () => {
      const inactiveLocation = testLocations[2];

      const response = await request(app)
        .get(`/api/locations/${inactiveLocation._id}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe("Admin Routes", () => {
    describe("POST /api/locations", () => {
      test("should create new location as admin", async () => {
        const locationData = {
          name: "New Service Area",
          type: "area",
          coordinates: { lat: 40.7831, lng: -73.9712 },
          address: "Upper West Side, NY",
          isActive: true,
          serviceRadius: 4,
          priority: 1,
        };

        const response = await request(app)
          .post("/api/locations")
          .set(getAuthHeaders(adminToken))
          .send(locationData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.location.name).toBe(locationData.name);
      });

      test("should reject location creation by non-admin", async () => {
        const locationData = {
          name: "Unauthorized Location",
          type: "area",
          coordinates: { lat: 40.7831, lng: -73.9712 },
        };

        const response = await request(app)
          .post("/api/locations")
          .set(getAuthHeaders(userToken))
          .send(locationData)
          .expect(403);

        expect(response.body.success).toBe(false);
      });

      test("should validate required fields", async () => {
        const response = await request(app)
          .post("/api/locations")
          .set(getAuthHeaders(adminToken))
          .send({ name: "Incomplete Location" })
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      test("should validate coordinate format", async () => {
        const locationData = {
          name: "Invalid Coords Location",
          type: "area",
          coordinates: { lat: "invalid", lng: -73.9712 },
        };

        const response = await request(app)
          .post("/api/locations")
          .set(getAuthHeaders(adminToken))
          .send(locationData)
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe("PATCH /api/locations/:id", () => {
      test("should update location as admin", async () => {
        const location = testLocations[0];
        const updateData = {
          name: "Updated Downtown Area",
          serviceRadius: 7,
          priority: 5,
        };

        const response = await request(app)
          .patch(`/api/locations/${location._id}`)
          .set(getAuthHeaders(adminToken))
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.location.name).toBe(updateData.name);
        expect(response.body.data.location.serviceRadius).toBe(
          updateData.serviceRadius
        );
      });

      test("should reject update by non-admin", async () => {
        const location = testLocations[0];

        const response = await request(app)
          .patch(`/api/locations/${location._id}`)
          .set(getAuthHeaders(userToken))
          .send({ name: "Unauthorized Update" })
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });

    describe("DELETE /api/locations/:id", () => {
      test("should delete location as admin", async () => {
        const location = testLocations[0];

        const response = await request(app)
          .delete(`/api/locations/${location._id}`)
          .set(getAuthHeaders(adminToken))
          .expect(200);

        expect(response.body.success).toBe(true);

        // Verify location is deleted or marked inactive
        const deletedLocation = await Location.findById(location._id);
        expect(
          deletedLocation === null || deletedLocation.isActive === false
        ).toBe(true);
      });

      test("should reject deletion by non-admin", async () => {
        const location = testLocations[0];

        const response = await request(app)
          .delete(`/api/locations/${location._id}`)
          .set(getAuthHeaders(userToken))
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });

    describe("GET /api/locations/admin/all", () => {
      test("should get all locations including inactive as admin", async () => {
        const response = await request(app)
          .get("/api/locations/admin/all")
          .set(getAuthHeaders(adminToken))
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.locations)).toBe(true);

        // Should include inactive locations
        const hasInactiveLocation = response.body.data.locations.some(
          (location) => !location.isActive
        );
        expect(hasInactiveLocation).toBe(true);
      });

      test("should reject access by non-admin", async () => {
        const response = await request(app)
          .get("/api/locations/admin/all")
          .set(getAuthHeaders(userToken))
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe("Geospatial Queries", () => {
    test("should find locations within polygon", async () => {
      const polygon = [
        [-74.1, 40.6],
        [-73.9, 40.6],
        [-73.9, 40.8],
        [-74.1, 40.8],
        [-74.1, 40.6],
      ];

      const response = await request(app)
        .post("/api/locations/within-polygon")
        .send({ polygon })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.locations)).toBe(true);
    });

    test("should validate polygon format", async () => {
      const invalidPolygon = [
        [-74.1, 40.6],
        [-73.9, 40.6],
      ]; // Not enough points for a polygon

      const response = await request(app)
        .post("/api/locations/within-polygon")
        .send({ polygon: invalidPolygon })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test("should check service availability at coordinates", async () => {
      const response = await request(app)
        .get("/api/locations/service-check?lat=40.7128&lng=-74.0060")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("serviceAvailable");
      expect(typeof response.body.data.serviceAvailable).toBe("boolean");
    });
  });

  describe("Caching", () => {
    test("should return cached response for repeated location requests", async () => {
      // First request
      const response1 = await request(app).get("/api/locations").expect(200);

      // Second request (should be cached)
      const response2 = await request(app).get("/api/locations").expect(200);

      expect(response1.body).toEqual(response2.body);
    });
  });

  describe("Error Handling", () => {
    test("should handle invalid ObjectId in URL params", async () => {
      const response = await request(app)
        .get("/api/locations/invalid-id")
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test("should handle coordinate boundary validation", async () => {
      const response = await request(app)
        .get("/api/locations/nearby?lat=200&lng=-74.0060&radius=10")
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test("should handle negative radius values", async () => {
      const response = await request(app)
        .get("/api/locations/nearby?lat=40.7128&lng=-74.0060&radius=-5")
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe("Performance", () => {
    test("should handle large radius searches efficiently", async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get("/api/locations/nearby?lat=40.7128&lng=-74.0060&radius=100")
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test("should limit search results for performance", async () => {
      const response = await request(app)
        .get(
          "/api/locations/nearby?lat=40.7128&lng=-74.0060&radius=100&limit=50"
        )
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.locations.length).toBeLessThanOrEqual(50);
    });
  });

  describe("Unauthorized Access", () => {
    test("should allow public access to public location routes", async () => {
      const response = await request(app).get("/api/locations").expect(200);

      expect(response.body.success).toBe(true);
    });

    test("should reject admin routes without authentication", async () => {
      const response = await request(app)
        .post("/api/locations")
        .send({ name: "Test Location" })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
