# Integration Testing Guide

## 🧪 Overview

This guide explains how to run the comprehensive integration tests for the DashStream application. The tests verify that the frontend-backend integration is working correctly.

## 🚀 Quick Start

### 1. Start the Backend Server

```bash
# Navigate to backend directory
cd DashStream_Apk_backend

# Install dependencies (if not already done)
npm install

# Start the server
node start-server.js
```

The server will start on `http://localhost:5000` and you'll see:
```
🚀 Server running on http://0.0.0.0:5000
📊 Health check: http://0.0.0.0:5000/api/health
🔧 API Base URL: http://0.0.0.0:5000/api
```

### 2. Run Integration Tests

In a new terminal window:

```bash
# Navigate to backend directory
cd DashStream_Apk_backend

# Run the integration tests
node run-tests.js
```

## 📊 Test Categories

### 🔐 Authentication Tests
- Send OTP functionality
- Verify OTP functionality
- Token generation and validation

### 👤 User Profile Tests
- Get user profile
- Update user profile
- Profile data persistence

### 🔧 Services Tests
- Get all services
- Get popular services
- Create new services (admin)
- Service data validation

### 📅 Bookings Tests
- Create bookings
- Get user bookings
- Get booking details
- Booking status updates

### 🎁 Offers Tests
- Get active offers
- Get featured offers
- Offer validation

### 👑 Admin Tests
- Dashboard statistics
- Admin user management
- Admin booking management

### ⚠️ Error Handling Tests
- Invalid endpoints (404)
- Unauthorized access (401)
- Invalid data (400)
- Server errors (500)

### 🔒 Security Tests
- CORS headers
- Security headers
- XSS protection
- Content type options

### 🔄 Data Synchronization Tests
- Data creation and retrieval
- Immediate data availability
- Data consistency

## 📈 Understanding Test Results

### Success Indicators
- ✅ Green checkmarks indicate passed tests
- High success rate (80%+)
- No critical errors in authentication or data flow

### Failure Indicators
- ❌ Red X marks indicate failed tests
- Low success rate (<80%)
- Authentication failures
- Data synchronization issues

### Sample Output
```
📊 INTEGRATION TEST REPORT
==================================================
Total Tests: 25
Passed: 23 ✅
Failed: 2 ❌
Success Rate: 92.0%

🔧 Integration Status:
✅ All tests passed! Frontend-Backend integration is working correctly.
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Server Not Starting
```bash
# Check if port 5000 is already in use
netstat -an | grep 5000

# Kill process using port 5000 (if needed)
lsof -ti:5000 | xargs kill -9
```

#### 2. Database Connection Issues
```bash
# Check MongoDB connection
# Ensure MongoDB is running
mongod --version

# Check environment variables
cat .env | grep MONGODB_URI
```

#### 3. Authentication Failures
- Verify phone number format: `+919876543210`
- Check OTP validation logic
- Ensure JWT token generation is working

#### 4. CORS Issues
- Check CORS configuration in `server.js`
- Verify allowed origins
- Test with different browsers/clients

### Debug Mode

To run tests with more verbose output:

```bash
# Set debug environment variable
DEBUG=* node run-tests.js

# Or with specific debug scope
DEBUG=integration:* node run-tests.js
```

## 🛠️ Customizing Tests

### Adding New Tests

1. Open `test-integration.js`
2. Add new test method to `IntegrationTester` class
3. Call the method in `runAllTests()`
4. Update test categories in this guide

### Modifying Test Data

Edit the test data constants at the top of `test-integration.js`:

```javascript
const TEST_PHONE = '+919876543210';
const TEST_OTP = '1234';
const testService = {
  title: 'Test Car Wash',
  // ... other properties
};
```

### Environment Configuration

Create or update `.env` file:

```env
API_BASE_URL=http://localhost:5000/api
MONGODB_URI=mongodb://localhost:27017/dashstream
JWT_SECRET=your-secret-key
NODE_ENV=development
```

## 📊 Performance Testing

### Load Testing
```bash
# Install artillery for load testing
npm install -g artillery

# Run load tests
artillery quick --count 10 --num 5 http://localhost:5000/api/health
```

### Memory Usage
```bash
# Monitor memory usage during tests
node --inspect run-tests.js
```

## 🔄 Continuous Integration

### GitHub Actions Example
```yaml
name: Integration Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm start &
      - run: sleep 10
      - run: node run-tests.js
```

## 📝 Test Reports

Test results are automatically saved to:
- Console output (immediate feedback)
- `integration-test-report.json` (detailed results)

### Report Structure
```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "overallSuccess": true,
  "results": {
    "backend": { "success": true, "successRate": 95 },
    "frontend": { "success": true, "successRate": 90 },
    "integration": { "success": true }
  }
}
```

## 🎯 Best Practices

1. **Run tests before deployment**
2. **Fix failing tests immediately**
3. **Keep test data realistic**
4. **Update tests when adding new features**
5. **Monitor test performance**
6. **Document test failures**

## 🆘 Getting Help

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
