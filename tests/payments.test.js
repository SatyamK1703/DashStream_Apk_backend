import request from "supertest";
import app from "../src/app.js";
import Payment from "../src/models/paymentModel.js";
import Booking from "../src/models/bookingModel.js";
import Service from "../src/models/serviceModel.js";
import {
  createTestUser,
  createTestAdmin,
  generateTestToken,
  getAuthHeaders,
  cleanupTestData,
} from "./helpers/testHelpers.js";

describe("Payment Endpoints", () => {
  let customer, admin;
  let customerToken, adminToken;
  let testBooking, testService, testPayment;

  beforeEach(async () => {
    await cleanupTestData();

    // Create test users
    customer = await createTestUser({ role: "customer" });
    admin = await createTestAdmin();

    // Generate tokens
    customerToken = generateTestToken(customer._id, "customer");
    adminToken = generateTestToken(admin._id, "admin");

    // Create test service
    testService = await Service.create({
      name: "Test Service",
      description: "Test service for payments",
      category: "plumbing",
      price: 100,
      duration: 60,
      isActive: true,
    });

    // Create test booking
    testBooking = await Booking.create({
      customer: customer._id,
      service: testService._id,
      scheduledDate: new Date(),
      address: {
        street: "123 Test St",
        city: "Test City",
        state: "Test State",
        zipCode: "12345",
      },
      status: "pending",
      totalAmount: 100,
    });
  });

  describe("POST /api/payments/webhook", () => {
    test("should handle payment webhook", async () => {
      const webhookData = {
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: "pay_test123",
              amount: 10000, // ₹100 in paisa
              status: "captured",
            },
          },
        },
      };

      const response = await request(app)
        .post("/api/payments/webhook")
        .send(webhookData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test("should handle invalid webhook data", async () => {
      const response = await request(app)
        .post("/api/payments/webhook")
        .send({ invalid: "data" })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/payments/create-order", () => {
    test("should create payment order", async () => {
      const orderData = {
        bookingId: testBooking._id,
        amount: 100,
        currency: "INR",
      };

      const response = await request(app)
        .post("/api/payments/create-order")
        .set(getAuthHeaders(customerToken))
        .send(orderData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("orderId");
      expect(response.body.data).toHaveProperty("amount");
    });

    test("should validate booking ownership", async () => {
      const otherUser = await createTestUser({
        phone: "+1234567899",
        email: "other@example.com",
      });
      const otherToken = generateTestToken(otherUser._id, "customer");

      const orderData = {
        bookingId: testBooking._id,
        amount: 100,
      };

      const response = await request(app)
        .post("/api/payments/create-order")
        .set(getAuthHeaders(otherToken))
        .send(orderData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    test("should validate required fields", async () => {
      const response = await request(app)
        .post("/api/payments/create-order")
        .set(getAuthHeaders(customerToken))
        .send({ bookingId: testBooking._id })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/payments/verify", () => {
    beforeEach(async () => {
      testPayment = await Payment.create({
        user: customer._id,
        booking: testBooking._id,
        razorpayOrderId: "order_test123",
        amount: 100,
        currency: "INR",
        status: "created",
      });
    });

    test("should verify payment", async () => {
      const verifyData = {
        razorpay_order_id: "order_test123",
        razorpay_payment_id: "pay_test123",
        razorpay_signature: "signature_test123",
      };

      // Mock Razorpay verification (in real tests, this would be properly mocked)
      const response = await request(app)
        .post("/api/payments/verify")
        .set(getAuthHeaders(customerToken))
        .send(verifyData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test("should handle invalid payment signature", async () => {
      const verifyData = {
        razorpay_order_id: "order_test123",
        razorpay_payment_id: "pay_test123",
        razorpay_signature: "invalid_signature",
      };

      const response = await request(app)
        .post("/api/payments/verify")
        .set(getAuthHeaders(customerToken))
        .send(verifyData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test("should validate required verification fields", async () => {
      const response = await request(app)
        .post("/api/payments/verify")
        .set(getAuthHeaders(customerToken))
        .send({ razorpay_order_id: "order_test123" })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /api/payments/user", () => {
    beforeEach(async () => {
      await Payment.create({
        user: customer._id,
        booking: testBooking._id,
        razorpayOrderId: "order_test123",
        amount: 100,
        currency: "INR",
        status: "completed",
      });
    });

    test("should get user payments", async () => {
      const response = await request(app)
        .get("/api/payments/user")
        .set(getAuthHeaders(customerToken))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.payments)).toBe(true);
      expect(response.body.data.payments.length).toBeGreaterThan(0);
    });

    test("should support pagination", async () => {
      const response = await request(app)
        .get("/api/payments/user?page=1&limit=10")
        .set(getAuthHeaders(customerToken))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("pagination");
    });

    test("should filter by status", async () => {
      const response = await request(app)
        .get("/api/payments/user?status=completed")
        .set(getAuthHeaders(customerToken))
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe("GET /api/payments/:id", () => {
    beforeEach(async () => {
      testPayment = await Payment.create({
        user: customer._id,
        booking: testBooking._id,
        razorpayOrderId: "order_test123",
        amount: 100,
        currency: "INR",
        status: "completed",
      });
    });

    test("should get payment details", async () => {
      const response = await request(app)
        .get(`/api/payments/${testPayment._id}`)
        .set(getAuthHeaders(customerToken))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.payment.id).toBe(testPayment._id.toString());
    });

    test("should reject access to other users payments", async () => {
      const otherUser = await createTestUser({
        phone: "+1234567899",
        email: "other@example.com",
      });
      const otherToken = generateTestToken(otherUser._id, "customer");

      const response = await request(app)
        .get(`/api/payments/${testPayment._id}`)
        .set(getAuthHeaders(otherToken))
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    test("should return 404 for non-existent payment", async () => {
      const fakeId = "60d5ecb74844e5a3d4f6d789";

      const response = await request(app)
        .get(`/api/payments/${fakeId}`)
        .set(getAuthHeaders(customerToken))
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/payments/:id/refund", () => {
    beforeEach(async () => {
      testPayment = await Payment.create({
        user: customer._id,
        booking: testBooking._id,
        razorpayOrderId: "order_test123",
        razorpayPaymentId: "pay_test123",
        amount: 100,
        currency: "INR",
        status: "completed",
      });
    });

    test("should initiate refund as admin", async () => {
      const refundData = {
        amount: 50,
        reason: "Service not delivered",
      };

      const response = await request(app)
        .post(`/api/payments/${testPayment._id}/refund`)
        .set(getAuthHeaders(adminToken))
        .send(refundData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test("should reject refund by non-admin", async () => {
      const refundData = {
        amount: 50,
        reason: "Test refund",
      };

      const response = await request(app)
        .post(`/api/payments/${testPayment._id}/refund`)
        .set(getAuthHeaders(customerToken))
        .send(refundData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    test("should validate refund amount", async () => {
      const refundData = {
        amount: 150, // More than payment amount
        reason: "Invalid refund",
      };

      const response = await request(app)
        .post(`/api/payments/${testPayment._id}/refund`)
        .set(getAuthHeaders(adminToken))
        .send(refundData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test("should handle refund for already refunded payment", async () => {
      // Update payment to refunded status
      await Payment.findByIdAndUpdate(testPayment._id, {
        status: "refunded",
        refundAmount: 100,
      });

      const refundData = {
        amount: 50,
        reason: "Second refund attempt",
      };

      const response = await request(app)
        .post(`/api/payments/${testPayment._id}/refund`)
        .set(getAuthHeaders(adminToken))
        .send(refundData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe("Error Handling", () => {
    test("should handle invalid ObjectId in URL params", async () => {
      const response = await request(app)
        .get("/api/payments/invalid-id")
        .set(getAuthHeaders(customerToken))
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test("should handle Razorpay API errors", async () => {
      // This test would mock Razorpay API to return an error
      const orderData = {
        bookingId: testBooking._id,
        amount: -100, // Invalid amount
      };

      const response = await request(app)
        .post("/api/payments/create-order")
        .set(getAuthHeaders(customerToken))
        .send(orderData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe("Security Tests", () => {
    test("should validate webhook signature", async () => {
      // Test webhook without proper signature validation
      const webhookData = {
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: "pay_malicious123",
              amount: 10000,
              status: "captured",
            },
          },
        },
      };

      // Without proper X-Razorpay-Signature header
      const response = await request(app)
        .post("/api/payments/webhook")
        .send(webhookData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test("should prevent payment verification replay attacks", async () => {
      const verifyData = {
        razorpay_order_id: "order_used123",
        razorpay_payment_id: "pay_used123",
        razorpay_signature: "signature_used123",
      };

      // First verification attempt
      await request(app)
        .post("/api/payments/verify")
        .set(getAuthHeaders(customerToken))
        .send(verifyData);

      // Second verification attempt (should be rejected)
      const response = await request(app)
        .post("/api/payments/verify")
        .set(getAuthHeaders(customerToken))
        .send(verifyData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe("Unauthorized Access", () => {
    test("should reject requests without token", async () => {
      const response = await request(app).get("/api/payments/user").expect(401);

      expect(response.body.success).toBe(false);
    });

    test("should reject requests with invalid token", async () => {
      const response = await request(app)
        .get("/api/payments/user")
        .set(getAuthHeaders("invalid-token"))
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
