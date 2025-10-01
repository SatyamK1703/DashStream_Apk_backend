export default {
  preset: "default",
  extensionsToTreatAsEsm: [".js"],
  globals: {
    "ts-jest": {
      useESM: true,
    },
  },
  moduleNameMapping: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  testEnvironment: "node",
  transform: {},
  collectCoverageFrom: ["src/**/*.js", "!src/**/*.test.js", "!src/config/**"],
  testMatch: ["**/tests/**/*.test.js"],
  setupFiles: [],
  setupFilesAfterEnv: [],
};
