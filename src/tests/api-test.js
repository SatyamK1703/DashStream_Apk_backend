/**
 * API Test Script
 * Tests all API endpoints for the React Native app
 */

// Import required modules
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:5000/api';
const EMAIL = 'test@example.com';
const PASSWORD = 'password123';
let authToken = '';
let userId = '';
let serviceId = '';
let bookingId = '';
let notificationId = '';
let deviceToken = 'test-device-token-' + Date.now();

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

// Helper functions
const logSuccess = (message) => {
  console.log(`${colors.green}✓ ${message}${colors.reset}`);
  testResults.passed++;
  testResults.total++;
};

const logError = (message, error) => {
  console.error(`${colors.red}✗ ${message}${colors.reset}`);
  if (error) {
    console.error(`  ${colors.dim}${error.message || error}${colors.reset}`);
    if (error.response) {
      console.error(`  ${colors.dim}Status: ${error.response.status}${colors.reset}`);
      console.error(`  ${colors.dim}Data: ${JSON.stringify(error.response.data)}${colors.reset}`);
    }
  }
  testResults.failed++;
  testResults.total++;
};

const logSkipped = (message) => {
  console.log(`${colors.yellow}⚠ SKIPPED: ${message}${colors.reset}`);
  testResults.skipped++;
  testResults.total++;
};

const logSection = (title) => {
  console.log(`\n${colors.bright}${colors.blue}=== ${title} ===${colors.reset}\n`);
};

// Create axios instance with auth header
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Set auth token for subsequent requests
const setAuthToken = (token) => {
  authToken = token;
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

// Test functions
async function testAuth() {
  logSection('Authentication Tests');
  
  try {
    // Register
    const registerData = {
      name: 'Test User',
      email: EMAIL,
      password: PASSWORD,
      passwordConfirm: PASSWORD,
      phone: '+1234567890'
    };
    
    try {
      const registerRes = await api.post('/auth/register', registerData);
      logSuccess('Register endpoint works');
    } catch (error) {
      if (error.response && error.response.status === 400 && 
          error.response.data.message.includes('already exists')) {
        logSuccess('Register endpoint works (user already exists)');
      } else {
        throw error;
      }
    }
    
    // Login
    const loginRes = await api.post('/auth/login', {
      email: EMAIL,
      password: PASSWORD
    });
    
    if (loginRes.data && loginRes.data.token) {
      setAuthToken(loginRes.data.token);
      userId = loginRes.data.data.user._id;
      logSuccess('Login endpoint works');
    } else {
      logError('Login endpoint failed', 'No token received');
    }
    
  } catch (error) {
    logError('Authentication tests failed', error);
  }
}

async function testUserProfile() {
  logSection('User Profile Tests');
  
  if (!authToken) {
    logSkipped('User profile tests skipped - no auth token');
    return;
  }
  
  try {
    // Get my profile
    const profileRes = await api.get('/users/me');
    logSuccess('Get profile endpoint works');
    
    // Update profile
    const updateData = {
      name: 'Updated Test User'
    };
    
    const updateRes = await api.patch('/users/updateMe', updateData);
    logSuccess('Update profile endpoint works');
    
  } catch (error) {
    logError('User profile tests failed', error);
  }
}

async function testServices() {
  logSection('Services Tests');
  
  try {
    // Get all services
    const servicesRes = await api.get('/services');
    
    if (servicesRes.data && Array.isArray(servicesRes.data.data.services)) {
      logSuccess('Get services endpoint works');
      
      // Save a service ID for booking tests
      if (servicesRes.data.data.services.length > 0) {
        serviceId = servicesRes.data.data.services[0]._id;
      }
    } else {
      logError('Get services endpoint failed', 'Invalid response format');
    }
    
    // Get service categories
    const categoriesRes = await api.get('/services/categories');
    logSuccess('Get service categories endpoint works');
    
  } catch (error) {
    logError('Services tests failed', error);
  }
}

async function testBookings() {
  logSection('Bookings Tests');
  
  if (!authToken || !serviceId) {
    logSkipped('Booking tests skipped - no auth token or service ID');
    return;
  }
  
  try {
    // Create booking
    const bookingData = {
      service: serviceId,
      scheduledDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
      scheduledTime: '14:00',
      address: '123 Test St',
      city: 'Test City',
      notes: 'API Test Booking'
    };
    
    const createRes = await api.post('/bookings', bookingData);
    
    if (createRes.data && createRes.data.data && createRes.data.data.booking) {
      bookingId = createRes.data.data.booking._id;
      logSuccess('Create booking endpoint works');
    } else {
      logError('Create booking endpoint failed', 'Invalid response format');
    }
    
    // Get my bookings
    const myBookingsRes = await api.get('/bookings/my-bookings');
    logSuccess('Get my bookings endpoint works');
    
    if (bookingId) {
      // Get single booking
      const bookingRes = await api.get(`/bookings/${bookingId}`);
      logSuccess('Get single booking endpoint works');
      
      // Update booking status
      const updateStatusRes = await api.patch(`/bookings/${bookingId}/status`, {
        status: 'confirmed'
      });
      logSuccess('Update booking status endpoint works');
      
      // Add tracking update
      const trackingRes = await api.post(`/bookings/${bookingId}/tracking`, {
        message: 'Test tracking update',
        status: 'confirmed'
      });
      logSuccess('Add tracking update endpoint works');
    }
    
  } catch (error) {
    logError('Bookings tests failed', error);
  }
}

async function testNotifications() {
  logSection('Notifications Tests');
  
  if (!authToken) {
    logSkipped('Notification tests skipped - no auth token');
    return;
  }
  
  try {
    // Get my notifications
    const notificationsRes = await api.get('/notifications');
    logSuccess('Get notifications endpoint works');
    
    // Get unread count
    const unreadRes = await api.get('/notifications/unread-count');
    logSuccess('Get unread count endpoint works');
    
    // Register device token
    const registerTokenRes = await api.post('/notifications/register-device', {
      token: deviceToken,
      deviceType: 'android',
      deviceInfo: { model: 'Test Device', osVersion: '10' }
    });
    logSuccess('Register device token endpoint works');
    
    // Get my devices
    const devicesRes = await api.get('/notifications/my-devices');
    logSuccess('Get my devices endpoint works');
    
    // Mark all as read
    const markAllRes = await api.patch('/notifications/mark-all-read');
    logSuccess('Mark all notifications as read endpoint works');
    
    // If we have notifications, test single notification endpoints
    if (notificationsRes.data && 
        notificationsRes.data.data && 
        notificationsRes.data.data.notifications && 
        notificationsRes.data.data.notifications.length > 0) {
      
      notificationId = notificationsRes.data.data.notifications[0]._id;
      
      // Mark as read
      const markReadRes = await api.patch(`/notifications/${notificationId}/read`);
      logSuccess('Mark notification as read endpoint works');
    }
    
    // Deregister device token
    const deregisterRes = await api.delete('/notifications/deregister-device', {
      data: { token: deviceToken }
    });
    logSuccess('Deregister device token endpoint works');
    
  } catch (error) {
    logError('Notifications tests failed', error);
  }
}

// Run all tests
async function runTests() {
  console.log(`${colors.bright}${colors.cyan}Starting API Tests for React Native App${colors.reset}`);
  console.log(`${colors.dim}API URL: ${API_URL}${colors.reset}\n`);
  
  const startTime = Date.now();
  
  await testAuth();
  await testUserProfile();
  await testServices();
  await testBookings();
  await testNotifications();
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  logSection('Test Results');
  console.log(`${colors.bright}Total Tests: ${testResults.total}${colors.reset}`);
  console.log(`${colors.green}Passed: ${testResults.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${testResults.failed}${colors.reset}`);
  console.log(`${colors.yellow}Skipped: ${testResults.skipped}${colors.reset}`);
  console.log(`${colors.dim}Duration: ${duration}s${colors.reset}\n`);
  
  if (testResults.failed === 0) {
    console.log(`${colors.bright}${colors.green}All tests passed!${colors.reset}`);
  } else {
    console.log(`${colors.bright}${colors.red}Some tests failed!${colors.reset}`);
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});