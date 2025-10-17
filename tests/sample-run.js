#!/usr/bin/env node

/**
 * Sample Test Runner
 * Quick test to verify the test setup is working
 */

import { spawn } from "child_process";

const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  header: (msg) =>
    console.log(`\n${colors.blue}${colors.reset}${msg}${colors.reset}\n`),
};

async function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: true,
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

async function main() {
  log.header("🧪 Sample Test Run for DashStream API");

  try {
    // Run a simple test first
    log.info("Running health check integration test...");

    await runCommand("npx", [
      "jest",
      "tests/integration/health.test.js",
      "--verbose",
      "--testTimeout=10000",
    ]);

    log.success("Health check test passed!");

    // Run auth tests
    log.info("Running authentication tests...");

    await runCommand("npx", [
      "jest",
      "tests/auth.test.js",
      "--verbose",
      "--testTimeout=15000",
    ]);

    log.success("Authentication tests passed!");

    log.header("🎉 Sample tests completed successfully!");
    log.info("You can now run the full test suite with: npm test");
    log.info("Or run all tests with: npm run test:all");
  } catch (error) {
    log.error(`Test failed: ${error.message}`);
    log.warn(
      "Please check your database connection and environment configuration"
    );
    log.info("Make sure to:");
    log.info("1. Configure .env.test file");
    log.info("2. Ensure MongoDB is running");
    log.info("3. Install all dependencies with: npm install");

    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
