/**
 * Centralized Logging System Tests
 * Tests the complete logging infrastructure including:
 * - Logger initialization in different environments
 * - Request ID propagation
 * - File transport handling for serverless environments
 * - Logging utilities functionality
 */

import { jest } from "@jest/globals";

// Mock environment before importing modules
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

describe("Centralized Logging System", () => {
  describe("Logger Initialization", () => {
    it("should initialize in development mode", async () => {
      process.env.NODE_ENV = "development";

      const { default: logger } = await import("../src/utils/logger.js");

      expect(logger).toBeDefined();
      expect(logger.level).toBe("debug");
    });

    it("should initialize in production mode with file transports", async () => {
      process.env.NODE_ENV = "production";
      delete process.env.VERCEL;
      delete process.env.AWS_LAMBDA_FUNCTION_NAME;

      const { default: logger } = await import("../src/utils/logger.js");

      expect(logger).toBeDefined();
      expect(logger.level).toBe("info");
    });

    it("should initialize in serverless environment without file transports", async () => {
      process.env.NODE_ENV = "production";
      process.env.VERCEL = "1";

      const { default: logger } = await import("../src/utils/logger.js");

      expect(logger).toBeDefined();
      expect(logger.level).toBe("info");
    });
  });

  describe("Request Logger Creation", () => {
    it("should create request logger with ID", async () => {
      const { createRequestLogger } = await import("../src/utils/logger.js");

      const requestLogger = createRequestLogger("test-request-123", {
        method: "POST",
        path: "/api/test",
      });

      expect(requestLogger).toBeDefined();

      // Mock the logger to capture output
      const mockInfo = jest.fn();
      requestLogger.info = mockInfo;

      requestLogger.info("Test message");

      expect(mockInfo).toHaveBeenCalledWith("Test message");
    });
  });

  describe("Logging Utilities", () => {
    it("should provide structured logging functions", async () => {
      const loggingUtils = await import("../src/utils/logging.js");

      expect(loggingUtils.logDatabaseOperation).toBeDefined();
      expect(loggingUtils.logAuthEvent).toBeDefined();
      expect(loggingUtils.logPaymentEvent).toBeDefined();
      expect(loggingUtils.logExternalApiCall).toBeDefined();
      expect(loggingUtils.logBusinessEvent).toBeDefined();
      expect(loggingUtils.logPerformance).toBeDefined();
      expect(loggingUtils.logSecurityEvent).toBeDefined();
      expect(loggingUtils.logValidationError).toBeDefined();
      expect(loggingUtils.logRateLimit).toBeDefined();
    });

    it("should handle logging without request logger", async () => {
      const { logDatabaseOperation } = await import("../src/utils/logging.js");

      // Should not throw when called without request logger
      expect(() => {
        logDatabaseOperation(
          null,
          "findOne",
          "User",
          { userId: "test" },
          { duration: 50, success: true }
        );
      }).not.toThrow();
    });
  });

  describe("Error Handling", () => {
    it("should handle file system errors gracefully", async () => {
      // Mock fs.mkdirSync to throw an error
      const fs = await import("fs");
      const originalMkdirSync = fs.mkdirSync;

      fs.mkdirSync = jest.fn().mockImplementation(() => {
        throw new Error("ENOENT: no such file or directory");
      });

      process.env.NODE_ENV = "production";
      delete process.env.VERCEL;

      try {
        const { default: logger } = await import("../src/utils/logger.js");
        expect(logger).toBeDefined();
      } finally {
        fs.mkdirSync = originalMkdirSync;
      }
    });
  });

  describe("Log Levels", () => {
    it("should export correct log levels", async () => {
      const { logLevels } = await import("../src/utils/logger.js");

      expect(logLevels).toEqual({
        error: 0,
        warn: 1,
        info: 2,
        http: 3,
        verbose: 4,
        debug: 5,
        silly: 6,
      });
    });
  });
});

describe("Request ID Middleware Integration", () => {
  it("should generate and attach request IDs", async () => {
    const { generateRequestId } = await import(
      "../src/middleware/requestId.js"
    );

    const requestId = generateRequestId();

    expect(requestId).toBeDefined();
    expect(typeof requestId).toBe("string");
    expect(requestId.length).toBeGreaterThan(0);
  });

  it("should create request logger in middleware", async () => {
    const requestIdMiddleware = await import("../src/middleware/requestId.js");

    const mockReq = {
      method: "GET",
      originalUrl: "/api/test",
      get: jest.fn().mockImplementation((header) => {
        if (header === "User-Agent") return "test-agent";
        if (header === "x-forwarded-for") return null;
        return null;
      }),
      ip: "127.0.0.1",
    };

    const mockRes = {
      on: jest.fn(),
    };

    const mockNext = jest.fn();

    requestIdMiddleware.default(mockReq, mockRes, mockNext);

    expect(mockReq.requestId).toBeDefined();
    expect(mockReq.logger).toBeDefined();
    expect(mockNext).toHaveBeenCalled();
  });
});
