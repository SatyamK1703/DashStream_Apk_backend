// Integration Test Suite for Frontend-Backend Integration
import axios from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });


// Test configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';
const TEST_PHONE = '+919876543210';
const TEST_OTP = '1234';

// Test data
const testUser = {
  phone: TEST_PHONE,
  name: 'Test User',
  role: 'customer'
};

const testService = {
  title: 'Test Car Wash',
  description: 'Test service for integration',
  category: 'car wash',
  price: 500,
  duration: '30 mins',
  vehicleType: '4 Wheeler',
  isActive: true
};

const testBooking = {
  serviceId: 'test-service-id',
  scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  scheduledTime: '10:00',
  address: {
    street: '123 Test Street',
    city: 'Test City',
    state: 'Test State',
    pincode: '123456'
  },
  totalAmount: 500,
  finalAmount: 500
};

class IntegrationTester {
  constructor() {
    this.token = null;
    this.userId = null;
    this.serviceId = null;
    this.bookingId = null;
    this.testResults = [];
  }

  // Helper method to make authenticated requests
  async makeRequest(method, endpoint, data = null) {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` })
      }
    };

    if (data) {
      config.data = data;
    }

    try {
      const response = await axios(config);
      return { success: true, data: response.data, status: response.status };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data || error.message,
        status: error.response?.status || 500
      };
    }
  }

  // Test authentication flow
  async testAuthentication() {
    console.log('\n🔐 Testing Authentication Flow...');
    
    // Test 1: Send OTP
    const otpResult = await this.makeRequest('POST', '/auth/send-otp', { phone: TEST_PHONE });
    this.recordTest('Send OTP', otpResult.success, otpResult);
    
    // Test 2: Verify OTP
    const verifyResult = await this.makeRequest('POST', '/auth/verify-otp', {
      phone: TEST_PHONE,
      otp: TEST_OTP
    });
    
    if (verifyResult.success && verifyResult.data.token) {
      this.token = verifyResult.data.token;
      this.userId = verifyResult.data.user?.id;
      this.recordTest('Verify OTP', true, verifyResult);
    } else {
      this.recordTest('Verify OTP', false, verifyResult);
    }
  }

  // Test user profile operations
  async testUserProfile() {
    console.log('\n👤 Testing User Profile Operations...');
    
    if (!this.token) {
      console.log('❌ Skipping user profile tests - no authentication token');
      return;
    }

    // Test 1: Get user profile
    const profileResult = await this.makeRequest('GET', '/users/me');
    this.recordTest('Get User Profile', profileResult.success, profileResult);

    // Test 2: Update user profile
    const updateResult = await this.makeRequest('PATCH', '/users/update-profile', {
      name: 'Updated Test User'
    });
    this.recordTest('Update User Profile', updateResult.success, updateResult);
  }

  // Test services operations
  async testServices() {
    console.log('\n🔧 Testing Services Operations...');

    // Test 1: Get all services
    const servicesResult = await this.makeRequest('GET', '/services');
    this.recordTest('Get All Services', servicesResult.success, servicesResult);

    // Test 2: Get popular services
    const popularResult = await this.makeRequest('GET', '/services/popular');
    this.recordTest('Get Popular Services', popularResult.success, popularResult);

    // Test 3: Create service (admin only)
    if (this.token) {
      const createResult = await this.makeRequest('POST', '/admin/services', testService);
      if (createResult.success && createResult.data.service) {
        this.serviceId = createResult.data.service.id;
      }
      this.recordTest('Create Service', createResult.success, createResult);
    }
  }

  // Test bookings operations
  async testBookings() {
    console.log('\n📅 Testing Bookings Operations...');

    if (!this.token) {
      console.log('❌ Skipping booking tests - no authentication token');
      return;
    }

    // Test 1: Create booking
    const createResult = await this.makeRequest('POST', '/bookings', testBooking);
    if (createResult.success && createResult.data.booking) {
      this.bookingId = createResult.data.booking.id;
    }
    this.recordTest('Create Booking', createResult.success, createResult);

    // Test 2: Get user bookings
    const bookingsResult = await this.makeRequest('GET', '/bookings/my-bookings');
    this.recordTest('Get User Bookings', bookingsResult.success, bookingsResult);

    // Test 3: Get booking details
    if (this.bookingId) {
      const detailsResult = await this.makeRequest('GET', `/bookings/${this.bookingId}`);
      this.recordTest('Get Booking Details', detailsResult.success, detailsResult);
    }
  }

  // Test offers operations
  async testOffers() {
    console.log('\n🎁 Testing Offers Operations...');

    // Test 1: Get active offers
    const activeResult = await this.makeRequest('GET', '/offers/active');
    this.recordTest('Get Active Offers', activeResult.success, activeResult);

    // Test 2: Get featured offers
    const featuredResult = await this.makeRequest('GET', '/offers/featured');
    this.recordTest('Get Featured Offers', featuredResult.success, featuredResult);
  }

  // Test admin operations
  async testAdminOperations() {
    console.log('\n👑 Testing Admin Operations...');

    if (!this.token) {
      console.log('❌ Skipping admin tests - no authentication token');
      return;
    }

    // Test 1: Get dashboard stats
    const dashboardResult = await this.makeRequest('GET', '/admin/dashboard');
    this.recordTest('Get Dashboard Stats', dashboardResult.success, dashboardResult);

    // Test 2: Get all bookings (admin)
    const adminBookingsResult = await this.makeRequest('GET', '/admin/bookings');
    this.recordTest('Get All Bookings (Admin)', adminBookingsResult.success, adminBookingsResult);

    // Test 3: Get all users (admin)
    const usersResult = await this.makeRequest('GET', '/admin/users');
    this.recordTest('Get All Users (Admin)', usersResult.success, usersResult);
  }

  // Test error handling
  async testErrorHandling() {
    console.log('\n⚠️ Testing Error Handling...');

    // Test 1: Invalid endpoint
    const invalidResult = await this.makeRequest('GET', '/invalid-endpoint');
    this.recordTest('Invalid Endpoint (404)', invalidResult.status === 404, invalidResult);

    // Test 2: Unauthorized access
    const unauthorizedResult = await this.makeRequest('GET', '/users/me');
    this.recordTest('Unauthorized Access (401)', unauthorizedResult.status === 401, unauthorizedResult);

    // Test 3: Invalid data
    const invalidDataResult = await this.makeRequest('POST', '/bookings', { invalid: 'data' });
    this.recordTest('Invalid Data (400)', invalidDataResult.status === 400, invalidDataResult);
  }

  // Test CORS and security headers
  async testSecurity() {
    console.log('\n🔒 Testing Security Headers...');

    try {
      const response = await axios.get(`${BASE_URL}/health`);
      const headers = response.headers;
      
      const securityTests = [
        { name: 'CORS Headers', check: headers['access-control-allow-origin'] },
        { name: 'Content-Type Options', check: headers['x-content-type-options'] === 'nosniff' },
        { name: 'Frame Options', check: headers['x-frame-options'] === 'DENY' },
        { name: 'XSS Protection', check: headers['x-xss-protection'] },
        { name: 'No X-Powered-By', check: !headers['x-powered-by'] }
      ];

      securityTests.forEach(test => {
        this.recordTest(test.name, !!test.check, { headers });
      });
    } catch (error) {
      this.recordTest('Security Headers', false, { error: error.message });
    }
  }

  // Test data synchronization
  async testDataSync() {
    console.log('\n🔄 Testing Data Synchronization...');

    if (!this.token) {
      console.log('❌ Skipping data sync tests - no authentication token');
      return;
    }

    // Test 1: Create data and verify it's accessible
    const testData = {
      title: 'Sync Test Service',
      description: 'Testing data synchronization',
      category: 'car wash',
      price: 300,
      duration: '20 mins',
      vehicleType: '2 Wheeler',
      isActive: true
    };

    const createResult = await this.makeRequest('POST', '/admin/services', testData);
    if (createResult.success) {
      const serviceId = createResult.data.service.id;
      
      // Test 2: Verify data is immediately available
      const getResult = await this.makeRequest('GET', `/services/${serviceId}`);
      this.recordTest('Data Sync - Immediate Availability', getResult.success, getResult);
    }
  }

  // Record test result
  recordTest(testName, passed, details) {
    const result = {
      test: testName,
      passed,
      details,
      timestamp: new Date().toISOString()
    };
    
    this.testResults.push(result);
    
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${testName}`);
    
    if (!passed && details.error) {
      console.log(`   Error: ${JSON.stringify(details.error)}`);
    }
  }

  // Generate test report
  generateReport() {
    console.log('\n📊 INTEGRATION TEST REPORT');
    console.log('='.repeat(50));
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log(`Failed: ${failedTests} ❌`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`   - ${r.test}`);
          if (r.details.error) {
            console.log(`     Error: ${JSON.stringify(r.details.error)}`);
          }
        });
    }
    
    console.log('\n🔧 Integration Status:');
    if (passedTests === totalTests) {
      console.log('✅ All tests passed! Frontend-Backend integration is working correctly.');
    } else if (passedTests > totalTests * 0.8) {
      console.log('⚠️ Most tests passed. Minor issues detected.');
    } else {
      console.log('❌ Multiple test failures. Integration needs attention.');
    }
    
    return {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      successRate: (passedTests / totalTests) * 100,
      results: this.testResults
    };
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Starting Frontend-Backend Integration Tests...');
    console.log(`📍 Testing against: ${BASE_URL}`);
    
    try {
      await this.testAuthentication();
      await this.testUserProfile();
      await this.testServices();
      await this.testBookings();
      await this.testOffers();
      await this.testAdminOperations();
      await this.testErrorHandling();
      await this.testSecurity();
      await this.testDataSync();
      
      return this.generateReport();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      return { error: error.message };
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new IntegrationTester();
  tester.runAllTests()
    .then(report => {
      if (report.error) {
        process.exit(1);
      } else {
        process.exit(report.failed > 0 ? 1 : 0);
      }
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export default IntegrationTester;
