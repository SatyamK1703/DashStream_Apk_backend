const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Setup script for DashStream backend
 * This script will:
 * 1. Install dependencies
 * 2. Create .env file if it doesn't exist
 * 3. Provide instructions for starting the server
 */

console.log('\n🚀 Setting up DashStream backend...\n');

// Check if node_modules exists
if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
  console.log('📦 Installing dependencies...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed successfully!\n');
  } catch (error) {
    console.error('❌ Failed to install dependencies:', error.message);
    process.exit(1);
  }
} else {
  console.log('✅ Dependencies already installed.\n');
}

// Check if .env file exists
if (!fs.existsSync(path.join(__dirname, '.env'))) {
  console.log('🔧 Creating .env file...');
  
  const envContent = `NODE_ENV=development
PORT=5000
MONGODB_URI= mongodb+srv://satyamgdoc:DashStream@dashstream.f1r1dvl.mongodb.net
JWT_SECRET=your_jwt_secret_key_change_this_in_production
JWT_EXPIRES_IN=90d
JWT_COOKIE_EXPIRES_IN=90

# Rate limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000

# For development only - in production use actual SMS service
SMS_ENABLED=false
`;
  
  try {
    fs.writeFileSync(path.join(__dirname, '.env'), envContent);
    console.log('✅ .env file created successfully!\n');
  } catch (error) {
    console.error('❌ Failed to create .env file:', error.message);
    console.log('Please create a .env file manually with the required environment variables.\n');
  }
} else {
  console.log('✅ .env file already exists.\n');
}

// Check if MongoDB is installed
console.log('ℹ️ Make sure MongoDB is installed and running on your system.');
console.log('   If using MongoDB Atlas, update the MONGODB_URI in your .env file.\n');

// Instructions for starting the server
console.log('🚀 To start the development server, run:');
console.log('   npm run dev\n');

console.log('🚀 To start the production server, run:');
console.log('   npm start\n');

console.log('🧪 To seed the database with sample data, run:');
console.log('   node src/utils/seedData.js --import\n');

console.log('🔍 To test the API endpoints, run:');
console.log('   node src/utils/testApi.js\n');

console.log('📚 For API documentation, see README.md\n');

console.log('✅ Setup complete! Happy coding! 🎉\n');