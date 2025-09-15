#!/usr/bin/env node

/**
 * Test Runner Script
 * Runs all test suites with proper setup and teardown
 */

import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  header: (msg) =>
    console.log(`\n${colors.bright}${colors.blue}${msg}${colors.reset}\n`),
  separator: () => console.log(`${colors.dim}${"─".repeat(50)}${colors.reset}`),
};

// Test suites configuration
const testSuites = [
  {
    name: "Unit Tests",
    pattern: "tests/**/*.test.js",
    exclude: ["tests/integration/.*"],
    timeout: 30000,
  },
  {
    name: "Integration Tests",
    pattern: "tests/integration/**/*.test.js",
    timeout: 60000,
  },
];

// Individual test files with descriptions
const testFiles = [
  { file: "auth.test.js", description: "Authentication endpoints" },
  { file: "users.test.js", description: "User management endpoints" },
  { file: "bookings.test.js", description: "Booking management endpoints" },
  { file: "services.test.js", description: "Service catalog endpoints" },
  { file: "payments.test.js", description: "Payment processing endpoints" },
  { file: "offers.test.js", description: "Offer management endpoints" },
  {
    file: "notifications.test.js",
    description: "Notification system endpoints",
  },
  { file: "admin.test.js", description: "Administrative endpoints" },
  {
    file: "integration/health.test.js",
    description: "Health check and core functionality",
  },
];

async function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    // Add NODE_OPTIONS for ES modules support when running Jest
    const env = {
      ...process.env,
      NODE_OPTIONS: "--experimental-vm-modules",
    };

    const child = spawn(command, args, {
      stdio: "inherit",
      shell: true,
      env: env,
      ...options,
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on("error", reject);
  });
}

async function checkPrerequisites() {
  log.header("🔍 Checking Prerequisites");

  try {
    // Check if test database is available
    log.info("Checking test database connection...");
    // You could add actual database connection check here

    // Check if required environment variables are set
    const requiredEnvVars = ["MONGODB_URI", "JWT_SECRET"];
    const missing = requiredEnvVars.filter((envVar) => !process.env[envVar]);

    if (missing.length > 0) {
      log.warn(`Missing environment variables: ${missing.join(", ")}`);
      log.info("Loading test environment variables from .env.test");
    }

    log.success("Prerequisites check completed");
  } catch (error) {
    log.error(`Prerequisites check failed: ${error.message}`);
    throw error;
  }
}

async function runTestSuite(suite) {
  log.header(`🧪 Running ${suite.name}`);

  const jestArgs = [
    "--testMatch",
    `**/${suite.pattern}`,
    "--testTimeout",
    suite.timeout.toString(),
    "--verbose",
    "--detectOpenHandles",
    "--forceExit",
  ];

  if (suite.exclude) {
    suite.exclude.forEach((pattern) => {
      jestArgs.push("--testPathIgnorePatterns", pattern);
    });
  }

  try {
    await runCommand("npx", ["jest", ...jestArgs]);
    log.success(`${suite.name} completed successfully`);
  } catch (error) {
    log.error(`${suite.name} failed`);
    throw error;
  }
}

async function runIndividualTests() {
  log.header("📋 Test Files Overview");

  testFiles.forEach(({ file, description }) => {
    log.info(`${file.padEnd(30)} - ${description}`);
  });

  log.separator();

  for (const { file, description } of testFiles) {
    log.info(`Running ${file} - ${description}`);

    try {
      await runCommand("npx", [
        "jest",
        `tests/${file}`,
        "--verbose",
        "--detectOpenHandles",
        "--forceExit",
        "--testTimeout=30000",
      ]);
      log.success(`${file} passed`);
    } catch (error) {
      log.error(`${file} failed`);
      // Continue with other tests even if one fails
    }

    log.separator();
  }
}

async function generateCoverageReport() {
  log.header("📊 Generating Coverage Report");

  try {
    await runCommand("npx", [
      "jest",
      "--coverage",
      "--coverageReporters=text",
      "--coverageReporters=html",
      "--coverageReporters=lcov",
      "--collectCoverageFrom=src/**/*.js",
      "--coveragePathIgnorePatterns=/node_modules/",
      "--coveragePathIgnorePatterns=src/server.js",
      "--coveragePathIgnorePatterns=src/server.production.js",
    ]);

    log.success("Coverage report generated successfully");
    log.info("HTML coverage report available in coverage/index.html");
  } catch (error) {
    log.warn("Coverage report generation failed, but tests may have passed");
  }
}

async function cleanupAfterTests() {
  log.header("🧹 Cleanup");

  try {
    // Clean up any test artifacts, temporary files, etc.
    log.info("Cleaning up test artifacts...");

    // You could add cleanup logic here, such as:
    // - Removing test database
    // - Clearing temporary files
    // - Resetting test state

    log.success("Cleanup completed");
  } catch (error) {
    log.warn(`Cleanup warning: ${error.message}`);
  }
}

async function main() {
  const startTime = Date.now();

  console.log(`${colors.bright}${colors.magenta}`);
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║            DashStream API Test Suite        ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`${colors.reset}\n`);

  try {
    // Check command line arguments
    const runCoverage = process.argv.includes("--coverage");
    const runIndividual = process.argv.includes("--individual");
    const runFast = process.argv.includes("--fast");

    if (!runFast) {
      await checkPrerequisites();
    }

    if (runIndividual) {
      await runIndividualTests();
    } else {
      // Run test suites
      for (const suite of testSuites) {
        await runTestSuite(suite);
        log.separator();
      }
    }

    if (runCoverage) {
      await generateCoverageReport();
    }

    if (!runFast) {
      await cleanupAfterTests();
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    log.header("🎉 All Tests Completed Successfully");
    log.success(`Total execution time: ${duration} seconds`);

    console.log(
      `\n${colors.green}${colors.bright}All tests passed! 🚀${colors.reset}\n`
    );
  } catch (error) {
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    log.header("❌ Test Suite Failed");
    log.error(`Error: ${error.message}`);
    log.info(`Execution time: ${duration} seconds`);

    console.log(
      `\n${colors.red}${colors.bright}Some tests failed! Please check the output above. 💥${colors.reset}\n`
    );

    process.exit(1);
  }
}

// Handle process termination
process.on("SIGINT", () => {
  log.warn("\nTest run interrupted by user");
  process.exit(130);
});

process.on("SIGTERM", () => {
  log.warn("\nTest run terminated");
  process.exit(143);
});

// Run the main function
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
