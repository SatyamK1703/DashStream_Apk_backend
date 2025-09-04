// Production deployment script for DashStream backend
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
  buildDir: path.join(__dirname, 'build'),
  srcDir: path.join(__dirname, 'src'),
  envFile: path.join(__dirname, '.env.production'),
  packageManager: 'npm', // or 'yarn'
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/**
 * Log a message with color
 */
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Execute a shell command and log the output
 */
function execute(command, errorMessage) {
  try {
    log(`Executing: ${command}`, colors.dim);
    const output = execSync(command, { encoding: 'utf8' });
    return output;
  } catch (error) {
    log(`${errorMessage || 'Command failed'}:\n${error.message}`, colors.red);
    process.exit(1);
  }
}

/**
 * Check if a file exists
 */
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

/**
 * Create a directory if it doesn't exist
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    log(`Created directory: ${dirPath}`, colors.green);
  }
}

/**
 * Copy directory recursively
 */
function copyDirectory(source, destination) {
  ensureDirectoryExists(destination);
  
  const entries = fs.readdirSync(source, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);
    
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Main deployment function
 */
async function deploy() {
  try {
    // Start deployment
    log('\n🚀 Starting DashStream backend deployment...', colors.bright + colors.cyan);
    
    // Check for production environment file
    if (!fileExists(config.envFile)) {
      log(`Production environment file ${config.envFile} not found!`, colors.red);
      log('Please create this file with your production environment variables.', colors.yellow);
      process.exit(1);
    }
    
    // Clean previous build
    log('\n📦 Cleaning previous build...', colors.bright + colors.blue);
    if (fs.existsSync(config.buildDir)) {
      fs.rmSync(config.buildDir, { recursive: true, force: true });
      log('Previous build directory removed.', colors.green);
    }
    ensureDirectoryExists(config.buildDir);
    
    // Install dependencies
    log('\n📚 Installing dependencies...', colors.bright + colors.blue);
    execute(`${config.packageManager} install --production`, 'Failed to install dependencies');
    
    // Copy source files to build directory
    log('\n🔨 Building application...', colors.bright + colors.blue);
    copyDirectory(config.srcDir, path.join(config.buildDir, 'src'));
    log('Source files copied to build directory.', colors.green);
    
    // Copy production environment file
    log('\n🔒 Setting up environment...', colors.bright + colors.blue);
    fs.copyFileSync(config.envFile, path.join(config.buildDir, '.env'));
    log('Production environment file copied.', colors.green);
    
    // Copy package.json
    fs.copyFileSync(path.join(__dirname, 'package.json'), path.join(config.buildDir, 'package.json'));
    log('Package.json copied.', colors.green);
    
    // Copy public directory
    if (fs.existsSync(path.join(__dirname, 'public'))) {
      copyDirectory(path.join(__dirname, 'public'), path.join(config.buildDir, 'public'));
      log('Public directory copied.', colors.green);
    }
    
    // Create production README
    const readmeContent = `# DashStream Backend (Production Build)

This is the production build of the DashStream backend server.

## Deployment Instructions

1. Install dependencies: \`npm install --production\`
2. Start the server: \`npm start\`

Generated on: ${new Date().toISOString()}
`;
    
    fs.writeFileSync(path.join(config.buildDir, 'README.md'), readmeContent);
    log('Production README created.', colors.green);
    
    // Success message
    log('\n✅ Deployment build completed successfully!', colors.bright + colors.green);
    log(`The production build is available in the ${config.buildDir}/ directory.`, colors.bright);
    log('\nNext steps:', colors.bright + colors.yellow);
    log('1. Upload the build directory to your production server', colors.yellow);
    log('2. Install production dependencies: npm install --production', colors.yellow);
    log('3. Start the server: npm start', colors.yellow);
    log('\nHappy deploying! 🎉\n', colors.bright + colors.magenta);
    
  } catch (error) {
    log(`\n❌ Deployment failed: ${error.message}`, colors.bright + colors.red);
    process.exit(1);
  }
}

// Run the deployment
deploy();