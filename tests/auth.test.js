import request from "supertest";
import app from "../src/app.js";
import User from "../src/models/userModel.js";
import {
  createTestUser,
  generateTestToken,
  getAuthHeaders,
  generateTestPhone,
  mockOTPVerification,
  cleanupTestData,
} from "./helpers/testHelpers.js";

describe("Auth API_ENDPOINTS", () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  describe("POST /api/auth/send-otp", () => {
    test("should send OTP for new phone number", async () => {
      const phone = generateTestPhone();

      const response = await request(app)
        .post("/api/auth/send-otp")
        .send({ phone })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("OTP sent");
    });

    test("should send OTP for existing user", async () => {
      const user = await createTestUser();

      const response = await request(app)
        .post("/api/auth/send-otp")
        .send({ phone: user.phone })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test("should validate phone number format", async () => {
      const response = await request(app)
        .post("/api/auth/send-otp")
        .send({ phone: "invalid-phone" })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test("should handle missing phone number", async () => {
      const response = await request(app)
        .post("/api/auth/send-otp")
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/auth/verify-otp", () => {
    test("should verify OTP and login existing user", async () => {
      const user = await createTestUser();
      const otp = mockOTPVerification();

      const response = await request(app)
        .post("/api/auth/verify-otp")
        .send({
          phone: user.phone,
          otp,
          name: user.name,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("token");
      expect(response.body.data).toHaveProperty("refreshToken");
      expect(response.body.data.user.id).toBe(user._id.toString());
    });

    test("should create new user and login", async () => {
      const phone = generateTestPhone();
      const otp = mockOTPVerification();
      const name = "New Test User";

      const response = await request(app)
        .post("/api/auth/verify-otp")
        .send({ phone, otp, name })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.name).toBe(name);
      expect(response.body.data.user.phone).toBe(phone);
    });

    test("should reject invalid OTP", async () => {
      const user = await createTestUser();

      const response = await request(app)
        .post("/api/auth/verify-otp")
        .send({
          phone: user.phone,
          otp: "000000",
          name: user.name,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test("should handle missing required fields", async () => {
      const response = await request(app)
        .post("/api/auth/verify-otp")
        .send({ phone: generateTestPhone() })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/auth/refresh-token", () => {
    test("should refresh access token with valid refresh token", async () => {
      const user = await createTestUser();

      // First login to get refresh token
      const loginResponse = await request(app)
        .post("/api/auth/verify-otp")
        .send({
          phone: user.phone,
          otp: mockOTPVerification(),
          name: user.name,
        });

      const { refreshToken } = loginResponse.body.data;

      const response = await request(app)
        .post("/api/auth/refresh-token")
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("token");
    });

    test("should reject invalid refresh token", async () => {
      const response = await request(app)
        .post("/api/auth/refresh-token")
        .send({ refreshToken: "invalid-token" })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test("should handle missing refresh token", async () => {
      const response = await request(app)
        .post("/api/auth/refresh-token")
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe("Protected Routes", () => {
    let user, token;

    beforeEach(async () => {
      user = await createTestUser();
      token = generateTestToken(user._id);
    });

    describe("GET /api/auth/me", () => {
      test("should get current user info", async () => {
        const response = await request(app)
          .get("/api/auth/me")
          .set(getAuthHeaders(token))
          .expect(200);

        expect(response.body.status).toBe("success");
        expect(response.body.data.user.id).toBe(user._id.toString());
        expect(response.body.data.user.phone).toBe(user.phone);
      });

      test("should reject request without token", async () => {
        const response = await request(app).get("/api/auth/me").expect(401);

        expect(response.body.success).toBe(false);
      });
    });

    describe("GET /api/auth/verify-token", () => {
      test("should verify valid token", async () => {
        const response = await request(app)
          .get("/api/auth/verify-token")
          .set(getAuthHeaders(token))
          .expect(200);

        expect(response.body.status).toBe("success");
        expect(response.body.data.tokenValid).toBe(true);
        expect(response.body.data.userId).toBe(user._id.toString());
      });

      test("should reject invalid token", async () => {
        const response = await request(app)
          .get("/api/auth/verify-token")
          .set(getAuthHeaders("invalid-token"))
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });

    describe("POST /api/auth/logout", () => {
      test("should logout user successfully", async () => {
        const response = await request(app)
          .post("/api/auth/logout")
          .set(getAuthHeaders(token))
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain("logout");
      });

      test("should reject logout without token", async () => {
        const response = await request(app)
          .post("/api/auth/logout")
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });
  });
});
