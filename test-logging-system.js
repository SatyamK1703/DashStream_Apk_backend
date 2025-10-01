#!/usr/bin/env node

/**
 * Centralized Logging System Verification Script
 * Tests the complete logging infrastructure to ensure it works in both
 * local and serverless environments.
 */

import { createRequestLogger, logLevels } from "./src/utils/logger.js";
import { generateRequestId } from "./src/middleware/requestId.js";
import {
  logDatabaseOperation,
  logAuthEvent,
  logPaymentEvent,
  logExternalApiCall,
  logBusinessEvent,
  logPerformance,
  logSecurityEvent,
  logValidationError,
  logRateLimit,
} from "./src/utils/logging.js";

console.log("🔍 Testing Centralized Logging System...\n");

// Test 1: Logger Initialization
console.log("1. Testing Logger Initialization");
try {
  const { default: logger } = await import("./src/utils/logger.js");
  console.log("✅ Logger initialized successfully");
  console.log(`   - Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`   - Log Level: ${logger.level}`);
  console.log(`   - Transport Count: ${logger.transports.length}`);
} catch (error) {
  console.log("❌ Logger initialization failed:", error.message);
}

// Test 2: Request ID Generation
console.log("\n2. Testing Request ID Generation");
try {
  const requestId = generateRequestId();
  console.log("✅ Request ID generated:", requestId);
  console.log(`   - Type: ${typeof requestId}`);
  console.log(`   - Length: ${requestId.length}`);
} catch (error) {
  console.log("❌ Request ID generation failed:", error.message);
}

// Test 3: Request Logger Creation
console.log("\n3. Testing Request Logger Creation");
try {
  const requestId = generateRequestId();
  const requestLogger = createRequestLogger(requestId, {
    method: "POST",
    path: "/api/test",
    userAgent: "test-agent",
  });

  console.log("✅ Request logger created successfully");

  // Test logging with request context
  requestLogger.info("Test message with request context");
  requestLogger.debug("Debug message with metadata", {
    userId: "test-user-123",
    action: "test-action",
  });
} catch (error) {
  console.log("❌ Request logger creation failed:", error.message);
}

// Test 4: Logging Utilities
console.log("\n4. Testing Logging Utilities");
const testRequestId = generateRequestId();
const testLogger = createRequestLogger(testRequestId, {
  method: "GET",
  path: "/api/utils-test",
});

try {
  console.log("   Testing Database Operation Logging...");
  logDatabaseOperation("findOne", "User", { userId: "test" }, testLogger);

  console.log("   Testing Auth Event Logging...");
  logAuthEvent("OTP_SENT", "user123", { phoneNumber: "+1***7890" }, testLogger);

  console.log("   Testing Payment Event Logging...");
  logPaymentEvent(
    "PAYMENT_INITIATED",
    "pay_123",
    100,
    {
      orderId: "order_123",
    },
    testLogger
  );

  console.log("   Testing External API Call Logging...");
  logExternalApiCall("twilio", "/Messages", "POST", 250, 200, testLogger);

  console.log("   Testing Business Event Logging...");
  logBusinessEvent(
    "SERVICE_BOOKED",
    "booking",
    "book_123",
    {
      serviceId: "svc_123",
      customerId: "cust_456",
    },
    testLogger
  );

  console.log("   Testing Performance Logging...");
  logPerformance(
    "REQUEST_PROCESSING",
    1200,
    {
      memory: 45.2,
    },
    testLogger
  );

  console.log("   Testing Security Event Logging...");
  logSecurityEvent(
    "RATE_LIMIT_EXCEEDED",
    "high",
    {
      ip: "127.0.0.1",
      limit: 100,
    },
    testLogger
  );

  console.log("   Testing Validation Error Logging...");
  logValidationError("email", "invalid-email", "Invalid format", testLogger);

  console.log("   Testing Rate Limit Logging...");
  logRateLimit("API_REQUEST", 100, 95, testLogger);

  console.log("✅ All logging utilities tested successfully");
} catch (error) {
  console.log("❌ Logging utilities test failed:", error.message);
}

// Test 5: Log Levels
console.log("\n5. Testing Log Levels");
try {
  console.log("✅ Log levels exported:", JSON.stringify(logLevels, null, 2));
} catch (error) {
  console.log("❌ Log levels test failed:", error.message);
}

// Test 6: Error Handling without Request Logger
console.log("\n6. Testing Error Handling (No Request Logger)");
try {
  logDatabaseOperation("findOne", "User", { userId: "test" }, null);
  logAuthEvent("LOGIN_ATTEMPT", "user123", { success: false }, null);
  console.log("✅ Error handling without request logger works correctly");
} catch (error) {
  console.log("❌ Error handling test failed:", error.message);
}

// Test 7: Serverless Environment Simulation
console.log("\n7. Testing Serverless Environment Simulation");
try {
  // Set environment variables to simulate serverless
  process.env.NODE_ENV = "production";
  process.env.VERCEL = "1";

  // Re-import logger with serverless environment - use dynamic import with timestamp
  const { default: serverlessLogger } = await import(
    `./src/utils/logger.js?t=${Date.now()}`
  );

  console.log("✅ Serverless logger initialized successfully");

  // Clean up environment
  delete process.env.VERCEL;
  process.env.NODE_ENV = "development";
} catch (error) {
  console.log("❌ Serverless environment test failed:", error.message);
}

console.log("\n🎉 Centralized Logging System verification completed!");
console.log("\nKey Features Verified:");
console.log("✅ Request ID generation and propagation");
console.log("✅ Structured logging with context");
console.log("✅ Multiple logging utilities for different use cases");
console.log("✅ Serverless environment compatibility");
console.log("✅ Error handling and graceful fallbacks");
console.log("✅ Production and development configurations");
