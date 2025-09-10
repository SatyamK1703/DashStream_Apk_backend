/**
 * DashStream Quick Start Script
 * Fixes authentication issues and starts the production-ready server
 */
import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkEnvironment() {
  log('🔍 Checking environment configuration...', 'blue');
  
  const envPath = '.env';
  const envExamplePath = '.env.production';
  
  if (!existsSync(envPath)) {
    if (existsSync(envExamplePath)) {
      log('📋 Copying production environment template...', 'yellow');
      try {
        const envContent = readFileSync(envExamplePath, 'utf8');
        writeFileSync(envPath, envContent);
        log('✅ Environment file created from template', 'green');
        log('⚠️  Please update .env with your actual values!', 'yellow');
      } catch (error) {
        log(`❌ Error creating .env file: ${error.message}`, 'red');
        return false;
      }
    } else {
      log('❌ No environment file found. Please create .env file.', 'red');
      return false;
    }
  }

  // Check critical environment variables
  try {
    const envContent = readFileSync(envPath, 'utf8');
    const criticalVars = [
      'JWT_SECRET',
      'MONGODB_URI',
      'TWILIO_ACCOUNT_SID',
      'TWILIO_AUTH_TOKEN'
    ];

    const missingVars = criticalVars.filter(varName => {
      const regex = new RegExp(`^${varName}=.+`, 'm');
      return !regex.test(envContent) || envContent.includes(`${varName}=your-`);
    });

    if (missingVars.length > 0) {
      log('⚠️  Warning: The following environment variables need to be updated:', 'yellow');
      missingVars.forEach(varName => log(`   - ${varName}`, 'yellow'));
      log('Please update .env file with your actual values.', 'yellow');
    } else {
      log('✅ Environment configuration looks good!', 'green');
    }
  } catch (error) {
    log(`❌ Error reading environment file: ${error.message}`, 'red');
    return false;
  }

  return true;
}

function checkDependencies() {
  log('📦 Checking dependencies...', 'blue');
  
  try {
    if (!existsSync('node_modules')) {
      log('📥 Installing dependencies...', 'yellow');
      execSync('npm install', { stdio: 'inherit' });
      log('✅ Dependencies installed successfully!', 'green');
    } else {
      log('✅ Dependencies already installed', 'green');
    }
    return true;
  } catch (error) {
    log(`❌ Error installing dependencies: ${error.message}`, 'red');
    return false;
  }
}

function runHealthCheck() {
  log('🏥 Running health check...', 'blue');
  
  try {
    // Try to import and validate the production config
    execSync('node -e "import(\'./src/config/production.js\').then(m => m.validateProductionEnv())"', { 
      stdio: 'pipe' 
    });
    log('✅ Production configuration validated!', 'green');
    return true;
  } catch (error) {
    log('⚠️  Some environment variables might be missing', 'yellow');
    log('The server will start, but please check your .env file', 'yellow');
    return true; // Continue anyway
  }
}

function startServer() {
  log('🚀 Starting DashStream production server...', 'green');
  log('', 'reset');
  log('Server Features Enabled:', 'cyan');
  log('✅ Fixed Authentication (no more session expired errors)', 'green');
  log('✅ JWT Token Management with Refresh Tokens', 'green');
  log('✅ Production Security Headers', 'green');
  log('✅ Rate Limiting Protection', 'green');
  log('✅ Mobile App Optimized Responses', 'green');
  log('✅ Health Check Monitoring', 'green');
  log('', 'reset');
  
  try {
    // Start the production server
    execSync('npm start', { stdio: 'inherit' });
  } catch (error) {
    log(`❌ Server startup failed: ${error.message}`, 'red');
    log('', 'reset');
    log('🔧 Troubleshooting steps:', 'yellow');
    log('1. Check your .env file has all required values', 'yellow');
    log('2. Ensure MongoDB is running and accessible', 'yellow');
    log('3. Check if port 5000 is available', 'yellow');
    log('4. Run: npm run dev for development mode', 'yellow');
    process.exit(1);
  }
}

function showBanner() {
  log('', 'reset');
  log('╔══════════════════════════════════════════════════════════╗', 'cyan');
  log('║                    DashStream Backend                    ║', 'cyan');
  log('║              Production-Ready Quick Start                ║', 'cyan');
  log('╚══════════════════════════════════════════════════════════╝', 'cyan');
  log('', 'reset');
}

function showSuccessMessage() {
  log('', 'reset');
  log('🎉 DashStream Backend is starting!', 'green');
  log('', 'reset');
  log('📱 Mobile App Integration:', 'cyan');
  log('   Base URL: http://localhost:5000/api', 'reset');
  log('   Auth Endpoint: POST /auth/verify-otp', 'reset');
  log('   User Endpoint: GET /users/me', 'reset');
  log('', 'reset');
  log('🔧 Management URLs:', 'cyan');
  log('   Health Check: http://localhost:5000/health', 'reset');
  log('   API Health: http://localhost:5000/api/health', 'reset');
  log('', 'reset');
  log('🐛 If you still get session expired errors:', 'yellow');
  log('   1. Clear your mobile app cache/storage', 'yellow');
  log('   2. Re-login to get new JWT tokens', 'yellow');
  log('   3. Check mobile app is sending Authorization header', 'yellow');
  log('', 'reset');
  log('📖 See PRODUCTION_DEPLOYMENT_GUIDE.md for detailed info', 'blue');
  log('', 'reset');
}

// Main execution
async function main() {
  showBanner();
  
  // Step 1: Check environment
  if (!checkEnvironment()) {
    process.exit(1);
  }
  
  // Step 2: Check dependencies
  if (!checkDependencies()) {
    process.exit(1);
  }
  
  // Step 3: Health check
  if (!runHealthCheck()) {
    process.exit(1);
  }
  
  // Step 4: Show success message
  showSuccessMessage();
  
  // Step 5: Start server
  startServer();
}

// Handle process termination
process.on('SIGINT', () => {
  log('\n🛑 Server startup cancelled by user', 'yellow');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('\n🛑 Server startup terminated', 'yellow');
  process.exit(0);
});

// Run the quick start
main().catch(error => {
  log(`💥 Quick start failed: ${error.message}`, 'red');
  process.exit(1);
});