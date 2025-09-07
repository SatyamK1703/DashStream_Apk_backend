# Setup and Testing Guide

## 🚀 Quick Start Options

You have two options for testing the integration:

### Option 1: Mock Server (No MongoDB Required) ⭐ **RECOMMENDED FOR TESTING**

This option uses a mock server that doesn't require MongoDB or external services.

```bash
# Navigate to backend directory
cd DashStream_Apk_backend

# Start the mock server
node test-server.js
```

In a new terminal:
```bash
# Run tests against mock server
node run-mock-tests.js
```

### Option 2: Full Backend Server (Requires MongoDB)

This option uses the complete backend with MongoDB.

```bash
# Navigate to backend directory
cd DashStream_Apk_backend

# Create .env file (copy from .env.example and update values)
cp .env.example .env

# Start MongoDB (if not running)
# On Windows: Start MongoDB service
# On macOS: brew services start mongodb-community
# On Linux: sudo systemctl start mongod

# Start the full server
node start-server.js
```

In a new terminal:
```bash
# Run tests against full server
node run-tests.js
```

## 📋 Prerequisites

### For Mock Server Testing
- ✅ Node.js (v14 or higher)
- ✅ npm or yarn

### For Full Backend Testing
- ✅ Node.js (v14 or higher)
- ✅ npm or yarn
- ✅ MongoDB (v4.4 or higher)
- ✅ Environment variables configured

## 🔧 Environment Setup

### 1. Create Environment File

Create a `.env` file in the backend directory:

```bash
# Copy the example file
cp .env.example .env
```

### 2. Update Environment Variables

Edit the `.env` file with your actual values:

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/dashstream_test

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-for-testing-only
JWT_EXPIRES_IN=7d

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-for-testing-only
SESSION_EXPIRY=1209600000

# API Configuration
API_BASE_URL=http://localhost:5000/api
```

### 3. Install Dependencies

```bash
npm install
```

## 🧪 Running Tests

### Mock Server Tests (Recommended)

```bash
# Terminal 1: Start mock server
node test-server.js

# Terminal 2: Run tests
node run-mock-tests.js
```

**Expected Output:**
```
🚀 Starting Mock Server Integration Tests...
==================================================
Note: This uses a mock server without MongoDB dependency
==================================================

🔐 Testing Authentication Flow...
✅ Send OTP
✅ Verify OTP

👤 Testing User Profile Operations...
✅ Get User Profile
✅ Update User Profile

📊 INTEGRATION TEST REPORT
==================================================
Total Tests: 25
Passed: 25 ✅
Failed: 0 ❌
Success Rate: 100.0%

🎉 All tests passed! Mock integration is working correctly.
```

### Full Backend Tests

```bash
# Terminal 1: Start full server
node start-server.js

# Terminal 2: Run tests
node run-tests.js
```

## 🔍 Test Coverage

The integration tests cover:

### ✅ Authentication Flow
- Send OTP functionality
- Verify OTP functionality
- Token generation and validation

### ✅ User Profile Operations
- Get user profile
- Update user profile
- Profile data persistence

### ✅ Services Operations
- Get all services
- Get popular services
- Create new services (admin)
- Service data validation

### ✅ Bookings Operations
- Create bookings
- Get user bookings
- Get booking details
- Booking status updates

### ✅ Offers Operations
- Get active offers
- Get featured offers
- Offer validation

### ✅ Admin Operations
- Dashboard statistics
- Admin user management
- Admin booking management

### ✅ Error Handling
- Invalid endpoints (404)
- Unauthorized access (401)
- Invalid data (400)
- Server errors (500)

### ✅ Security Headers
- CORS headers
- Security headers
- XSS protection
- Content type options

### ✅ Data Synchronization
- Data creation and retrieval
- Immediate data availability
- Data consistency

## 🛠️ Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Check if port 5000 is in use
netstat -an | grep 5000

# Kill process using port 5000
lsof -ti:5000 | xargs kill -9
```

#### 2. MongoDB Connection Issues
```bash
# Check if MongoDB is running
mongod --version

# Start MongoDB service
# Windows: net start MongoDB
# macOS: brew services start mongodb-community
# Linux: sudo systemctl start mongod
```

#### 3. Environment Variables Not Loaded
```bash
# Check if .env file exists
ls -la .env

# Verify environment variables
node -e "require('dotenv').config(); console.log(process.env.MONGODB_URI)"
```

#### 4. Dependencies Not Installed
```bash
# Install dependencies
npm install

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Debug Mode

Run tests with verbose output:

```bash
# Set debug environment variable
DEBUG=* node run-mock-tests.js

# Or with specific debug scope
DEBUG=integration:* node run-mock-tests.js
```

## 📊 Understanding Test Results

### Success Indicators
- ✅ Green checkmarks indicate passed tests
- High success rate (80%+)
- No critical errors in authentication or data flow

### Failure Indicators
- ❌ Red X marks indicate failed tests
- Low success rate (<80%)
- Authentication failures
- Data synchronization issues

### Sample Success Output
```
📊 INTEGRATION TEST REPORT
==================================================
Total Tests: 25
Passed: 25 ✅
Failed: 0 ❌
Success Rate: 100.0%

🔧 Integration Status:
✅ All tests passed! Frontend-Backend integration is working correctly.
```

### Sample Failure Output
```
📊 INTEGRATION TEST REPORT
==================================================
Total Tests: 25
Passed: 20 ✅
Failed: 5 ❌
Success Rate: 80.0%

❌ Failed Tests:
   - Send OTP
   - Verify OTP
   - Get All Services
   - Get Popular Services
   - Get Active Offers

🔧 Integration Status:
⚠️ Most tests passed. Minor issues detected.
```

## 🎯 Best Practices

1. **Start with Mock Tests**: Use the mock server first to verify test logic
2. **Fix Issues Early**: Address failing tests immediately
3. **Use Real Backend**: Test with full backend before production
4. **Monitor Performance**: Watch for slow tests or memory issues
5. **Keep Tests Updated**: Update tests when adding new features

## 🚀 Production Deployment

Before deploying to production:

1. ✅ All integration tests pass
2. ✅ Environment variables configured
3. ✅ MongoDB connection established
4. ✅ Security headers implemented
5. ✅ Error handling working
6. ✅ CORS properly configured

## 📞 Getting Help

If you encounter issues:

1. Check the troubleshooting section above
2. Review the test output for specific error messages
3. Verify server logs for backend issues
4. Check network connectivity
5. Ensure all dependencies are installed

## 🎉 Success Criteria

Integration is considered successful when:
- ✅ All authentication tests pass
- ✅ Data flow tests pass
- ✅ Security tests pass
- ✅ Error handling tests pass
- ✅ Overall success rate > 90%

The application is ready for production when all integration tests pass consistently.
