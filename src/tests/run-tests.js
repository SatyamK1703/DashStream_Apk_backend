/**
 * Test Runner Script
 * Runs the API tests for the React Native app
 */

// Import required modules
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  cyan: '\x1b[36m'
};

console.log(`${colors.bright}${colors.cyan}Running API Tests...${colors.reset}\n`);

// Run the API tests
const testProcess = spawn('node', [join(__dirname, 'api-tests.js')], {
  stdio: 'inherit'
});

testProcess.on('close', (code) => {
  if (code === 0) {
    console.log(`\n${colors.bright}${colors.green}Tests completed successfully!${colors.reset}`);
  } else {
    console.log(`\n${colors.bright}${colors.red}Tests failed with code ${code}${colors.reset}`);
    process.exit(code);
  }
});