# DashStream API Test Suite

Comprehensive test suite for the DashStream Backend API covering all endpoints with authentication, authorization, validation, and error handling tests.

## 📋 Test Coverage

### Authentication Tests (`auth.test.js`)
- ✅ OTP sending and verification
- ✅ JWT token management
- ✅ Refresh token functionality
- ✅ User login/logout flows
- ✅ Token validation

### User Management Tests (`users.test.js`)
- ✅ Profile management (CRUD operations)
- ✅ Address management
- ✅ Professional profile management
- ✅ User role-based access control
- ✅ Admin user management

### Booking System Tests (`bookings.test.js`)
- ✅ Booking creation and management
- ✅ Status updates and tracking
- ✅ Rating and review system
- ✅ Professional-customer interactions
- ✅ Admin booking oversight

### Service Management Tests (`services.test.js`)
- ✅ Service catalog operations
- ✅ Category and search functionality
- ✅ Public and admin service management
- ✅ Caching and performance features
- ✅ Service activation/deactivation

### Payment Processing Tests (`payments.test.js`)
- ✅ Razorpay integration
- ✅ Payment order creation
- ✅ Payment verification
- ✅ Webhook handling
- ✅ Refund processing

### Offer Management Tests (`offers.test.js`)
- ✅ Offer creation and validation
- ✅ Discount calculations
- ✅ Usage limits and restrictions
- ✅ Offer activation/deactivation
- ✅ User eligibility checks

### Notification System Tests (`notifications.test.js`)
- ✅ Push notification management
- ✅ Device token registration
- ✅ Notification CRUD operations
- ✅ Firebase integration
- ✅ Bulk notification handling

### Admin Panel Tests (`admin.test.js`)
- ✅ Dashboard statistics
- ✅ User management
- ✅ Booking oversight
- ✅ Service administration
- ✅ Professional verification

### Integration Tests (`integration/health.test.js`)
- ✅ Health check endpoints
- ✅ CORS configuration
- ✅ Rate limiting
- ✅ Security headers
- ✅ Error handling

## 🚀 Running Tests

### Prerequisites
1. **MongoDB**: Ensure MongoDB is running locally or provide test database URL
2. **Environment**: Copy `.env.test` and configure test environment variables
3. **Dependencies**: Run `npm install` to install all dependencies

### Quick Start
```bash
# Run all tests
npm test

# Run specific test file
npx jest tests/auth.test.js

# Run tests with coverage
npm run test:coverage

# Run integration tests only
npm run test:integration
```

### Test Scripts
```bash
# Run all tests with custom script
node tests/run-all-tests.js

# Run individual test files separately
node tests/run-all-tests.js --individual

# Run tests with coverage report
node tests/run-all-tests.js --coverage

# Fast run (skip prerequisites check)
node tests/run-all-tests.js --fast
```

## 📁 Test Structure

```
tests/
├── setup.js                 # Global test setup and teardown
├── helpers/                 # Test utilities and helpers
│   └── testHelpers.js       # Common test functions
├── auth.test.js            # Authentication endpoint tests
├── users.test.js           # User management tests
├── bookings.test.js        # Booking system tests
├── services.test.js        # Service management tests
├── payments.test.js        # Payment processing tests
├── offers.test.js          # Offer management tests
├── notifications.test.js   # Notification system tests
├── admin.test.js           # Admin panel tests
├── integration/            # Integration tests
│   └── health.test.js      # Health check and core tests
├── run-all-tests.js        # Custom test runner
└── README.md               # This file
```

## 🔧 Configuration

### Jest Configuration (`jest.config.js`)
- ES modules support
- Custom test timeout (30 seconds)
- Coverage collection from `src/**/*.js`
- Setup files configuration
- Test environment: Node.js

### Environment Variables (`.env.test`)
- Test database URL
- Mock service credentials
- Disabled external services
- Test-specific configurations

### Test Helpers (`helpers/testHelpers.js`)
- User creation utilities
- Token generation
- Authentication headers
- Database cleanup
- Mock data generation

## 📊 Coverage Reports

After running tests with coverage, reports are generated in multiple formats:
- **Console**: Real-time coverage summary
- **HTML**: Detailed coverage report (`coverage/index.html`)
- **LCOV**: For CI/CD integration (`coverage/lcov.info`)

### Coverage Targets
- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

## 🧪 Test Features

### Authentication Testing
- JWT token validation
- Role-based access control
- Session management
- OTP verification mocking

### Database Testing
- Isolated test database
- Automatic cleanup between tests
- Transaction testing
- Data integrity validation

### API Testing
- Request/response validation
- HTTP status code verification
- Error message consistency
- Pagination testing

### Security Testing
- Input validation
- SQL injection prevention
- XSS protection
- Rate limiting verification

### Performance Testing
- Response time validation
- Caching functionality
- Database query optimization
- Memory leak detection

## 🐛 Debugging Tests

### Debug Mode
```bash
# Run with debug output
DEBUG=* npm test

# Run specific test in debug mode
npx jest tests/auth.test.js --detectOpenHandles --verbose
```

### Common Issues
1. **Database Connection**: Ensure test database is accessible
2. **Port Conflicts**: Use different ports for test environment
3. **External Services**: Mock external API calls in tests
4. **Memory Leaks**: Use `--detectOpenHandles` to identify issues

### Test Timeouts
- Default: 30 seconds per test
- Integration tests: 60 seconds
- Override with `--testTimeout=<milliseconds>`

## 📈 Continuous Integration

### GitHub Actions
```yaml
- name: Run Tests
  run: |
    npm install
    npm run test:ci
  env:
    MONGODB_URI: ${{ secrets.TEST_MONGODB_URI }}
    JWT_SECRET: ${{ secrets.TEST_JWT_SECRET }}
```

### Test Commands for CI
```bash
# CI test run (no watch, single run)
npm run test:ci

# Coverage for CI
npm run test:coverage:ci

# Parallel test execution
npm run test:parallel
```

## 🔄 Test Maintenance

### Adding New Tests
1. Create test file in appropriate directory
2. Use existing helpers and utilities
3. Follow naming convention: `*.test.js`
4. Add test description to `run-all-tests.js`

### Updating Tests
1. Keep tests updated with API changes
2. Maintain test data consistency
3. Update mock services as needed
4. Review coverage after changes

### Best Practices
- Write descriptive test names
- Use proper beforeEach/afterEach hooks
- Clean up test data after each test
- Mock external services
- Test both success and error scenarios
- Validate response structure and data

## 📞 Support

If you encounter issues with tests:
1. Check the test logs for specific error messages
2. Verify environment configuration
3. Ensure all dependencies are installed
4. Check database connectivity
5. Review the debugging section above

For additional help, refer to the main project documentation or contact the development team.