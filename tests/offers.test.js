import request from "supertest";
import app from "../src/app.js";
import Offer from "../src/models/offerModel.js";
import {
  createTestUser,
  createTestAdmin,
  generateTestToken,
  getAuthHeaders,
  cleanupTestData,
} from "./helpers/testHelpers.js";

describe("Offer API_ENDPOINTS", () => {
  let user, admin;
  let userToken, adminToken;
  let testOffers;

  beforeEach(async () => {
    await cleanupTestData();

    // Create test users
    user = await createTestUser();
    admin = await createTestAdmin();

    // Generate tokens
    userToken = generateTestToken(user._id, "customer");
    adminToken = generateTestToken(admin._id, "admin");

    // Create test offers
    testOffers = await Offer.insertMany([
      {
        title: "Summer Special",
        description: "Get 20% off on all plumbing services",
        offerCode: "SUMMER20",
        discountType: "percentage",
        discount: 20,
        minOrderValue: 100,
        maxDiscountAmount: 50,
        validFrom: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        isActive: true,
        isFeatured: true,
        usageLimit: 100,
        usageCount: 10,
        applicableServices: [],
        userUsageLimit: 1,
        createdBy: admin._id,
      },
      {
        title: "First Time User",
        description: "₹50 off on your first booking",
        offerCode: "FIRST50",
        discountType: "fixed",
        discount: 50,
        minOrderValue: 200,
        validFrom: new Date(Date.now() - 24 * 60 * 60 * 1000),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
        isFeatured: false,
        usageLimit: 1000,
        usageCount: 50,
        applicableServices: [],
        userUsageLimit: 1,
        createdBy: admin._id,
      },
      {
        title: "Expired Offer",
        description: "This offer has expired",
        offerCode: "EXPIRED10",
        discountType: "percentage",
        discount: 10,
        validFrom: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        validUntil: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // Expired 5 days ago
        isActive: true,
        usageLimit: 100,
        usageCount: 0,
        applicableServices: [],
        userUsageLimit: 1,
        createdBy: admin._id,
      },
      {
        title: "Inactive Offer",
        description: "This offer is inactive",
        offerCode: "INACTIVE15",
        discountType: "percentage",
        discount: 15,
        validFrom: new Date(Date.now() - 24 * 60 * 60 * 1000),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: false,
        usageLimit: 100,
        usageCount: 0,
        applicableServices: [],
        userUsageLimit: 1,
        createdBy: admin._id,
      },
    ]);
  });

  describe("Public Routes", () => {
    describe("GET /api/offers/active", () => {
      test("should get all active and valid offers", async () => {
        const response = await request(app)
          .get("/api/offers/active")
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.offers)).toBe(true);

        // Should only return active and non-expired offers
        response.body.data.offers.forEach((offer) => {
          expect(offer.isActive).toBe(true);
          expect(new Date(offer.endDate)).toBeInstanceOf(Date);
          expect(new Date(offer.endDate) > new Date()).toBe(true);
        });
      });

      test("should support category filtering", async () => {
        const response = await request(app)
          .get("/api/offers/active?category=plumbing")
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      test("should support pagination", async () => {
        const response = await request(app)
          .get("/api/offers/active?page=1&limit=2")
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty("pagination");
      });
    });

    describe("GET /api/offers/featured", () => {
      test("should get featured offers", async () => {
        const response = await request(app)
          .get("/api/offers/featured")
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.offers)).toBe(true);

        // Should only return featured offers
        response.body.data.offers.forEach((offer) => {
          expect(offer.featured).toBe(true);
        });
      });
    });

    describe("GET /api/offers/validate/:code", () => {
      test("should validate valid offer code", async () => {
        const response = await request(app)
          .get("/api/offers/validate/SUMMER20")
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.offer.offerCode).toBe("SUMMER20");
        expect(response.body.data.valid).toBe(true);
      });

      test("should handle invalid offer code", async () => {
        const response = await request(app)
          .get("/api/offers/validate/INVALID123")
          .expect(404);

        expect(response.body.success).toBe(false);
      });

      test("should handle expired offer code", async () => {
        const response = await request(app)
          .get("/api/offers/validate/EXPIRED10")
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("expired");
      });

      test("should handle inactive offer code", async () => {
        const response = await request(app)
          .get("/api/offers/validate/INACTIVE15")
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("active");
      });
    });

    describe("GET /api/offers/:id", () => {
      test("should get offer by ID", async () => {
        const offer = testOffers[0];

        const response = await request(app)
          .get(`/api/offers/${offer._id}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.offer.id).toBe(offer._id.toString());
      });

      test("should return 404 for non-existent offer", async () => {
        const fakeId = "60d5ecb74844e5a3d4f6d789";

        const response = await request(app)
          .get(`/api/offers/${fakeId}`)
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe("Authenticated User Routes", () => {
    describe("GET /api/offers", () => {
      test("should get all available offers for authenticated user", async () => {
        const response = await request(app)
          .get("/api/offers")
          .set(getAuthHeaders(userToken))
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.offers)).toBe(true);
      });

      test("should filter offers based on user eligibility", async () => {
        const response = await request(app)
          .get("/api/offers?newUserOnly=true")
          .set(getAuthHeaders(userToken))
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe("POST /api/offers/:id/use", () => {
      test("should use offer during booking", async () => {
        const offer = testOffers[0];
        const bookingData = {
          orderValue: 150,
          serviceCategory: "plumbing",
        };

        const response = await request(app)
          .post(`/api/offers/${offer._id}/use`)
          .set(getAuthHeaders(userToken))
          .send(bookingData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty("discount");
        expect(response.body.data.discount).toBeGreaterThan(0);
      });

      test("should validate minimum order value", async () => {
        const offer = testOffers[0];
        const bookingData = {
          orderValue: 50, // Less than minimum order value of 100
          serviceCategory: "plumbing",
        };

        const response = await request(app)
          .post(`/api/offers/${offer._id}/use`)
          .set(getAuthHeaders(userToken))
          .send(bookingData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("minimum");
      });

      test("should check service category eligibility", async () => {
        const offer = testOffers[0]; // Only applicable for plumbing
        const bookingData = {
          orderValue: 150,
          serviceCategory: "electrical",
        };

        const response = await request(app)
          .post(`/api/offers/${offer._id}/use`)
          .set(getAuthHeaders(userToken))
          .send(bookingData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("applicable");
      });

      test("should handle usage limit exceeded", async () => {
        // Update offer to have reached usage limit
        await Offer.findByIdAndUpdate(testOffers[0]._id, {
          usedCount: 100, // Equal to usage limit
        });

        const offer = testOffers[0];
        const bookingData = {
          orderValue: 150,
          serviceCategory: "plumbing",
        };

        const response = await request(app)
          .post(`/api/offers/${offer._id}/use`)
          .set(getAuthHeaders(userToken))
          .send(bookingData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("limit");
      });
    });
  });

  describe("Admin Routes", () => {
    describe("POST /api/offers", () => {
      test("should create new offer as admin", async () => {
        const offerData = {
          title: "New Year Special",
          description: "30% off on all services",
          code: "NEWYEAR30",
          discountType: "percentage",
          discountValue: 30,
          minOrderValue: 200,
          maxDiscountAmount: 100,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          isActive: true,
          usageLimit: 500,
        };

        const response = await request(app)
          .post("/api/offers")
          .set(getAuthHeaders(adminToken))
          .send(offerData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.offer.code).toBe(offerData.code);
      });

      test("should reject offer creation by non-admin", async () => {
        const offerData = {
          title: "Unauthorized Offer",
          code: "UNAUTH10",
        };

        const response = await request(app)
          .post("/api/offers")
          .set(getAuthHeaders(userToken))
          .send(offerData)
          .expect(403);

        expect(response.body.success).toBe(false);
      });

      test("should validate unique offer code", async () => {
        const offerData = {
          title: "Duplicate Code Offer",
          code: "SUMMER20", // Already exists
          discountType: "percentage",
          discountValue: 15,
        };

        const response = await request(app)
          .post("/api/offers")
          .set(getAuthHeaders(adminToken))
          .send(offerData)
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      test("should validate required fields", async () => {
        const response = await request(app)
          .post("/api/offers")
          .set(getAuthHeaders(adminToken))
          .send({ title: "Incomplete Offer" })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe("PATCH /api/offers/:id", () => {
      test("should update offer as admin", async () => {
        const offer = testOffers[0];
        const updateData = {
          title: "Updated Summer Special",
          discountValue: 25,
        };

        const response = await request(app)
          .patch(`/api/offers/${offer._id}`)
          .set(getAuthHeaders(adminToken))
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.offer.title).toBe(updateData.title);
        expect(response.body.data.offer.discountValue).toBe(
          updateData.discountValue
        );
      });

      test("should reject update by non-admin", async () => {
        const offer = testOffers[0];

        const response = await request(app)
          .patch(`/api/offers/${offer._id}`)
          .set(getAuthHeaders(userToken))
          .send({ title: "Unauthorized Update" })
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });

    describe("DELETE /api/offers/:id", () => {
      test("should delete offer as admin", async () => {
        const offer = testOffers[0];

        const response = await request(app)
          .delete(`/api/offers/${offer._id}`)
          .set(getAuthHeaders(adminToken))
          .expect(200);

        expect(response.body.success).toBe(true);

        // Verify offer is deleted or marked inactive
        const deletedOffer = await Offer.findById(offer._id);
        expect(deletedOffer === null || deletedOffer.isActive === false).toBe(
          true
        );
      });

      test("should reject deletion by non-admin", async () => {
        const offer = testOffers[0];

        const response = await request(app)
          .delete(`/api/offers/${offer._id}`)
          .set(getAuthHeaders(userToken))
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });

    describe("PATCH /api/offers/:id/activate", () => {
      test("should activate offer as admin", async () => {
        const inactiveOffer = testOffers[3]; // Inactive offer

        const response = await request(app)
          .patch(`/api/offers/${inactiveOffer._id}/activate`)
          .set(getAuthHeaders(adminToken))
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.offer.isActive).toBe(true);
      });
    });

    describe("PATCH /api/offers/:id/deactivate", () => {
      test("should deactivate offer as admin", async () => {
        const activeOffer = testOffers[0];

        const response = await request(app)
          .patch(`/api/offers/${activeOffer._id}/deactivate`)
          .set(getAuthHeaders(adminToken))
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.offer.isActive).toBe(false);
      });
    });

    describe("GET /api/offers/stats", () => {
      test("should get offer statistics as admin", async () => {
        const response = await request(app)
          .get("/api/offers/stats")
          .set(getAuthHeaders(adminToken))
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty("stats");
      });

      test("should reject stats access by non-admin", async () => {
        const response = await request(app)
          .get("/api/offers/stats")
          .set(getAuthHeaders(userToken))
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe("Error Handling", () => {
    test("should handle invalid ObjectId in URL params", async () => {
      const response = await request(app)
        .get("/api/offers/invalid-id")
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test("should handle concurrent offer usage", async () => {
      // This test would simulate multiple users trying to use the same offer simultaneously
      // In a real scenario, you'd want to test for race conditions
      const offer = testOffers[0];
      const bookingData = {
        orderValue: 150,
        serviceCategory: "plumbing",
      };

      const promises = Array(5)
        .fill()
        .map(() =>
          request(app)
            .post(`/api/offers/${offer._id}/use`)
            .set(getAuthHeaders(userToken))
            .send(bookingData)
        );

      const responses = await Promise.all(promises);

      // At least one should succeed, others might fail due to usage limits
      const successCount = responses.filter((res) => res.status === 200).length;
      expect(successCount).toBeGreaterThan(0);
    });
  });

  describe("Unauthorized Access", () => {
    test("should allow public access to public routes", async () => {
      const response = await request(app).get("/api/offers/active").expect(200);

      expect(response.body.success).toBe(true);
    });

    test("should reject protected routes without token", async () => {
      const response = await request(app).get("/api/offers").expect(401);

      expect(response.body.success).toBe(false);
    });

    test("should reject admin routes without proper role", async () => {
      const response = await request(app)
        .post("/api/offers")
        .set(getAuthHeaders(userToken))
        .send({ title: "Test" })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });
});
