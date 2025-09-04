// API Integration Tests for DashStream Backend
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const API_URL = process.env.TEST_API_URL || 'http://localhost:5000/api';
const TEST_PHONE = process.env.TEST_PHONE || '+1234567890';
let authToken = null;

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  total: 0
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
  cyan: '\x1b[36m'
};

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add response interceptor for error handling
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`${colors.red}Error ${error.response.status}:${colors.reset}`, error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error(`${colors.red}No response received:${colors.reset}`, error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error(`${colors.red}Request error:${colors.reset}`, error.message);
    }
    return Promise.reject(error);
  }
);

/**
 * Run a test case
 */
async function runTest(name, testFn, skip = false) {
  testResults.total++;
  
  if (skip) {
    console.log(`${colors.yellow}SKIPPED${colors.reset} - ${name}`);
    testResults.skipped++;
    return;
  }
  
  try {
    console.log(`\n${colors.bright}Running test:${colors.reset} ${name}`);
    await testFn();
    console.log(`${colors.green}PASSED${colors.reset} - ${name}`);
    testResults.passed++;
  } catch (error) {
    console.log(`${colors.red}FAILED${colors.reset} - ${name}`);
    testResults.failed++;
  }
}

/**
 * Authentication Tests
 */
async function testAuthentication() {
  // Test sending OTP
  await runTest('Send OTP', async () => {
    const response = await api.post('/auth/send-otp', { phone: TEST_PHONE });
    console.log('Response:', response.data);
    
    // For testing purposes, we'll use a hardcoded OTP (in a real app, the user would receive this via SMS)
    const testOtp = '123456';
    
    // Test verifying OTP
    const verifyResponse = await api.post('/auth/verify-otp', { 
      phone: TEST_PHONE, 
      otp: testOtp 
    });
    
    console.log('Verify Response:', verifyResponse.data);
    authToken = verifyResponse.data.data.token;
    
    // Set the token for subsequent requests
    api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
    
    if (!authToken) {
      throw new Error('Failed to get auth token');
    }
  });
}

/**
 * User Profile Tests
 */
async function testUserProfile() {
  // Test getting user profile
  await runTest('Get User Profile', async () => {
    const response = await api.get('/users/profile');
    console.log('User Profile:', response.data);
  });
  
  // Test updating user profile
  await runTest('Update User Profile', async () => {
    const updateData = {
      name: 'Test User',
      email: 'test@example.com'
    };
    
    const response = await api.put('/users/profile', updateData);
    console.log('Update Response:', response.data);
    
    // Verify the update
    const profileResponse = await api.get('/users/profile');
    if (profileResponse.data.data.name !== updateData.name) {
      throw new Error('Profile update failed');
    }
  });
}

/**
 * Services Tests
 */
async function testServices() {
  let serviceId;
  
  // Test getting all services
  await runTest('Get All Services', async () => {
    const response = await api.get('/services');
    console.log(`Found ${response.data.data.length} services`);
    
    if (response.data.data.length > 0) {
      serviceId = response.data.data[0]._id;
    }
  });
  
  // Test getting service details
  await runTest('Get Service Details', async () => {
    if (!serviceId) {
      throw new Error('No service ID available for testing');
    }
    
    const response = await api.get(`/services/${serviceId}`);
    console.log('Service Details:', response.data);
  });
}

/**
 * Bookings Tests
 */
async function testBookings() {
  let bookingId;
  let serviceId;
  
  // Get a service ID for booking
  try {
    const servicesResponse = await api.get('/services');
    if (servicesResponse.data.data.length > 0) {
      serviceId = servicesResponse.data.data[0]._id;
    }
  } catch (error) {
    console.error('Failed to get services for booking test');
  }
  
  // Test creating a booking
  await runTest('Create Booking', async () => {
    if (!serviceId) {
      throw new Error('No service ID available for booking test');
    }
    
    const bookingData = {
      service: serviceId,
      scheduledDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
      scheduledTime: '10:00 AM',
      vehicle: {
        type: '4 Wheeler',
        brand: 'Toyota',
        model: 'Corolla',
        color: 'Blue',
        registrationNumber: 'ABC123'
      },
      location: {
        address: '123 Test Street, Test City',
        coordinates: [77.2090, 28.6139] // Example coordinates
      }
    };
    
    const response = await api.post('/bookings', bookingData);
    console.log('Booking Created:', response.data);
    
    bookingId = response.data.data._id;
  });
  
  // Test getting all bookings
  await runTest('Get All Bookings', async () => {
    const response = await api.get('/bookings');
    console.log(`Found ${response.data.data.length} bookings`);
  });
  
  // Test getting booking details
  await runTest('Get Booking Details', async () => {
    if (!bookingId) {
      throw new Error('No booking ID available for testing');
    }
    
    const response = await api.get(`/bookings/${bookingId}`);
    console.log('Booking Details:', response.data);
  });
  
  // Test canceling a booking
  await runTest('Cancel Booking', async () => {
    if (!bookingId) {
      throw new Error('No booking ID available for testing');
    }
    
    const response = await api.patch(`/bookings/${bookingId}/cancel`, {
      cancellationReason: 'Testing cancellation'
    });
    
    console.log('Cancellation Response:', response.data);
    
    // Verify the cancellation
    const bookingResponse = await api.get(`/bookings/${bookingId}`);
    if (bookingResponse.data.data.status !== 'cancelled') {
      throw new Error('Booking cancellation failed');
    }
  });
}

/**
 * Notifications Tests
 */
async function testNotifications() {
  // Test getting all notifications
  await runTest('Get All Notifications', async () => {
    const response = await api.get('/notifications');
    console.log(`Found ${response.data.data.length} notifications`);
  });
  
  // Test registering a device for push notifications
  await runTest('Register Device Token', async () => {
    const deviceData = {
      token: 'test-fcm-token-' + Date.now(),
      deviceType: 'android',
      deviceInfo: {
        model: 'Test Model',
        osVersion: 'Android 12'
      }
    };
    
    const response = await api.post('/notifications/register-device', deviceData);
    console.log('Device Registration Response:', response.data);
  });
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log(`\n${colors.bright}${colors.cyan}=== DashStream API Integration Tests ===${colors.reset}\n`);
  console.log(`API URL: ${API_URL}`);
  console.log(`Test Phone: ${TEST_PHONE}`);
  console.log('\n-----------------------------------');
  
  try {
    // Run authentication tests first
    await testAuthentication();
    
    // Run other tests that require authentication
    await testUserProfile();
    await testServices();
    await testBookings();
    await testNotifications();
    
    // Print test results
    console.log(`\n${colors.bright}${colors.cyan}=== Test Results ===${colors.reset}`);
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`${colors.green}Passed: ${testResults.passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${testResults.failed}${colors.reset}`);
    console.log(`${colors.yellow}Skipped: ${testResults.skipped}${colors.reset}`);
    
    if (testResults.failed > 0) {
      console.log(`\n${colors.red}Some tests failed!${colors.reset}`);
      process.exit(1);
    } else {
      console.log(`\n${colors.green}All tests passed!${colors.reset}`);
      process.exit(0);
    }
  } catch (error) {
    console.error(`\n${colors.red}Test execution error:${colors.reset}`, error);
    process.exit(1);
  }
}

// Run the tests
runAllTests();