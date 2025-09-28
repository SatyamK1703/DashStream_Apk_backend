export default {
  // Test environment
  testEnvironment: "node",

  // Module name mapping for ES modules
  transform: {},

  // Test file patterns
  testMatch: ["**/tests/**/*.test.js", "**/__tests__/**/*.test.js"],

  // Setup files
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],

  // Coverage configuration
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/index.js",
    "!src/config/**",
    "!src/utils/databaseMonitoring.js",
  ],

  // Test timeout
  testTimeout: 30000,

  // Module directories
  moduleDirectories: ["node_modules", "src"],

  // Globals
  globals: {
    "process.env": {
      NODE_ENV: "test",
    },
  },

  // Verbose output
  verbose: true,

  // Force exit after tests complete
  forceExit: true,

  // Detect open handles
  detectOpenHandles: true,
};
