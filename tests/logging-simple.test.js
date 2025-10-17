/**
 * Simple logging test without database setup
 */

import request from "supertest";
import app from "../src/app.js";

describe("Simple Centralized Logging Test", () => {
  describe("Request ID Generation and Propagation", () => {
    it("should generate request ID when not provided", async () => {
      const response = await request(app).get("/api/health").expect(200);

      // Verify request ID is returned in header
      expect(response.headers["x-request-id"]).toBeDefined();
      expect(response.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
    });

    it("should honor provided request ID", async () => {
      const customRequestId = "test-request-123";

      const response = await request(app)
        .get("/api/health")
        .set("X-Request-ID", customRequestId)
        .expect(200);

      // Verify custom request ID is returned
      expect(response.headers["x-request-id"]).toBe(customRequestId);
    });

    it("should handle malformed request ID by generating new one", async () => {
      const response = await request(app)
        .get("/api/health")
        .set("X-Request-ID", "   ") // Whitespace only
        .expect(200);

      // Should generate new UUID
      expect(response.headers["x-request-id"]).toBeDefined();
      expect(response.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
    });
  });

  describe("Logging Utilities", () => {
    it("should provide consistent logging format across modules", async () => {
      // This test verifies that logging utilities are properly structured
      const { logAuthEvent, logDatabaseOperation, logPerformance } =
        await import("../src/utils/logging.js");

      expect(typeof logAuthEvent).toBe("function");
      expect(typeof logDatabaseOperation).toBe("function");
      expect(typeof logPerformance).toBe("function");
    });
  });

  describe("Logger Configuration", () => {
    it("should create logger with proper configuration", async () => {
      const { default: logger, createRequestLogger } = await import(
        "../src/utils/logger.js"
      );

      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe("function");
      expect(typeof logger.error).toBe("function");
      expect(typeof createRequestLogger).toBe("function");

      // Test child logger creation
      const childLogger = createRequestLogger("test-123", { test: "data" });
      expect(childLogger).toBeDefined();
      expect(typeof childLogger.info).toBe("function");
    });
  });

  describe("Health Check with Logging", () => {
    it("should log health check requests properly", async () => {
      const response = await request(app)
        .get("/api/health")
        .set("X-Client-Version", "1.0.0")
        .set("X-Platform", "test")
        .expect(200);

      expect(response.headers["x-request-id"]).toBeDefined();
      expect(response.body).toMatchObject({
        success: true,
        message: "Server is running",
        data: expect.objectContaining({
          environment: expect.any(String),
          timestamp: expect.any(String),
        }),
      });

      console.log("Health check Request ID:", response.headers["x-request-id"]);
    });
  });
});
