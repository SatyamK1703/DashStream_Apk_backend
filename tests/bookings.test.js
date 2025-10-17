import request from "supertest";
import app from "../src/app.js";
import Booking from "../src/models/bookingModel.js";
import Service from "../src/models/serviceModel.js";
import {
  createTestUser,
  createTestProfessional,
  createTestAdmin,
  generateTestToken,
  getAuthHeaders,
  cleanupTestData,
} from "./helpers/testHelpers.js";

describe("Booking API_ENDPOINTS", () => {
  let customer, professional, admin;
  let customerToken, professionalToken, adminToken;
  let testService;

  beforeEach(async () => {
    await cleanupTestData();

    // Create test users
    customer = await createTestUser({ role: "customer" });
    professional = await createTestProfessional();
    admin = await createTestAdmin();

    // Generate tokens
    customerToken = generateTestToken(customer._id, "customer");
    professionalToken = generateTestToken(professional._id, "professional");
    adminToken = generateTestToken(admin._id, "admin");

    // Create test service
    testService = await Service.create({
      name: "Test Service",
      description: "Test service description",
      category: "plumbing",
      price: 100,
      duration: 60,
      isActive: true,
    });
  });

  describe("POST /api/bookings", () => {
    test("should create new booking as customer", async () => {
      const bookingData = {
        service: testService._id,
        professional: professional._id,
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        address: {
          street: "123 Test St",
          city: "Test City",
          state: "Test State",
          zipCode: "12345",
        },
        notes: "Test booking notes",
      };

      const response = await request(app)
        .post("/api/bookings")
        .set(getAuthHeaders(customerToken))
        .send(bookingData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.booking.service).toBe(
        testService._id.toString()
      );
      expect(response.body.data.booking.professional).toBe(
        professional._id.toString()
      );
    });

    test("should reject booking creation by non-customer", async () => {
      const bookingData = {
        service: testService._id,
        professional: professional._id,
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      const response = await request(app)
        .post("/api/bookings")
        .set(getAuthHeaders(professionalToken))
        .send(bookingData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    test("should validate required booking fields", async () => {
      const response = await request(app)
        .post("/api/bookings")
        .set(getAuthHeaders(customerToken))
        .send({ notes: "Incomplete booking" })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /api/bookings/my-bookings", () => {
    beforeEach(async () => {
      // Create test booking
      await Booking.create({
        customer: customer._id,
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
      });
    });

    test("should get customer bookings", async () => {
      const response = await request(app)
        .get("/api/bookings/my-bookings")
        .set(getAuthHeaders(customerToken))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.bookings)).toBe(true);
      expect(response.body.data.bookings.length).toBeGreaterThan(0);
    });

    test("should get professional bookings", async () => {
      const response = await request(app)
        .get("/api/bookings/my-bookings")
        .set(getAuthHeaders(professionalToken))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.bookings)).toBe(true);
    });

    test("should support pagination", async () => {
      const response = await request(app)
        .get("/api/bookings/my-bookings?page=1&limit=10")
        .set(getAuthHeaders(customerToken))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("pagination");
    });
  });

  describe("GET /api/bookings/:id", () => {
    let testBooking;

    beforeEach(async () => {
      testBooking = await Booking.create({
        customer: customer._id,
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
      });
    });

    test("should get booking details as customer", async () => {
      const response = await request(app)
        .get(`/api/bookings/${testBooking._id}`)
        .set(getAuthHeaders(customerToken))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.booking.id).toBe(testBooking._id.toString());
    });

    test("should get booking details as assigned professional", async () => {
      const response = await request(app)
        .get(`/api/bookings/${testBooking._id}`)
        .set(getAuthHeaders(professionalToken))
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test("should reject access to other users bookings", async () => {
      const otherCustomer = await createTestUser({
        phone: "+1234567898",
        email: "other@example.com",
      });
      const otherToken = generateTestToken(otherCustomer._id, "customer");

      const response = await request(app)
        .get(`/api/bookings/${testBooking._id}`)
        .set(getAuthHeaders(otherToken))
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe("PATCH /api/bookings/:id/status", () => {
    let testBooking;

    beforeEach(async () => {
      testBooking = await Booking.create({
        customer: customer._id,
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
      });
    });

    test("should update booking status as professional", async () => {
      const response = await request(app)
        .patch(`/api/bookings/${testBooking._id}/status`)
        .set(getAuthHeaders(professionalToken))
        .send({ status: "accepted" })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.booking.status).toBe("accepted");
    });

    test("should validate status values", async () => {
      const response = await request(app)
        .patch(`/api/bookings/${testBooking._id}/status`)
        .set(getAuthHeaders(professionalToken))
        .send({ status: "invalid-status" })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/bookings/:id/tracking", () => {
    let testBooking;

    beforeEach(async () => {
      testBooking = await Booking.create({
        customer: customer._id,
        service: testService._id,
        professional: professional._id,
        scheduledDate: new Date(),
        address: {
          street: "123 Test St",
          city: "Test City",
          state: "Test State",
          zipCode: "12345",
        },
        status: "in-progress",
      });
    });

    test("should add tracking update as professional", async () => {
      const trackingData = {
        status: "On the way",
        location: { lat: 40.7128, lng: -74.006 },
        note: "Professional is heading to location",
      };

      const response = await request(app)
        .post(`/api/bookings/${testBooking._id}/tracking`)
        .set(getAuthHeaders(professionalToken))
        .send(trackingData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test("should reject tracking update from customer", async () => {
      const response = await request(app)
        .post(`/api/bookings/${testBooking._id}/tracking`)
        .set(getAuthHeaders(customerToken))
        .send({ status: "Test" })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/bookings/:id/rate", () => {
    let testBooking;

    beforeEach(async () => {
      testBooking = await Booking.create({
        customer: customer._id,
        service: testService._id,
        professional: professional._id,
        scheduledDate: new Date(),
        address: {
          street: "123 Test St",
          city: "Test City",
          state: "Test State",
          zipCode: "12345",
        },
        status: "completed",
      });
    });

    test("should rate booking as customer", async () => {
      const ratingData = {
        rating: 5,
        review: "Excellent service!",
      };

      const response = await request(app)
        .post(`/api/bookings/${testBooking._id}/rate`)
        .set(getAuthHeaders(customerToken))
        .send(ratingData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test("should validate rating range", async () => {
      const response = await request(app)
        .post(`/api/bookings/${testBooking._id}/rate`)
        .set(getAuthHeaders(customerToken))
        .send({ rating: 6 })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test("should reject rating from professional", async () => {
      const response = await request(app)
        .post(`/api/bookings/${testBooking._id}/rate`)
        .set(getAuthHeaders(professionalToken))
        .send({ rating: 5 })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /api/bookings/stats", () => {
    test("should get booking stats as professional", async () => {
      const response = await request(app)
        .get("/api/bookings/stats")
        .set(getAuthHeaders(professionalToken))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("stats");
    });

    test("should get booking stats as admin", async () => {
      const response = await request(app)
        .get("/api/bookings/stats")
        .set(getAuthHeaders(adminToken))
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test("should reject stats access from customer", async () => {
      const response = await request(app)
        .get("/api/bookings/stats")
        .set(getAuthHeaders(customerToken))
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe("Admin Routes", () => {
    describe("GET /api/bookings", () => {
      test("should get all bookings as admin", async () => {
        const response = await request(app)
          .get("/api/bookings")
          .set(getAuthHeaders(adminToken))
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.bookings)).toBe(true);
      });

      test("should reject access from non-admin", async () => {
        const response = await request(app)
          .get("/api/bookings")
          .set(getAuthHeaders(customerToken))
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe("Unauthorized Access", () => {
    test("should reject requests without token", async () => {
      const response = await request(app)
        .get("/api/bookings/my-bookings")
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test("should reject requests with invalid token", async () => {
      const response = await request(app)
        .get("/api/bookings/my-bookings")
        .set(getAuthHeaders("invalid-token"))
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
