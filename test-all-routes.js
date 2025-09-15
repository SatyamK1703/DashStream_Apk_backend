import fetch from 'node-fetch';

const BASE_URL = 'http://192.168.1.22:5000/api';

// Test data
const testData = {
  service: {
    title: 'Test Car Wash Service',
    description: 'A comprehensive car wash service for testing',
    price: 299,
    duration: '45 mins',
    category: 'car wash',
    image: 'https://via.placeholder.com/300x200',
    banner: 'https://via.placeholder.com/600x300',
    vehicleType: '4 Wheeler',
    features: ['Exterior wash', 'Interior cleaning'],
    tags: ['premium', 'car wash'],
    isActive: true,
    isPopular: false,
  },
  booking: {
    serviceId: 'test-service-id',
    scheduledDate: new Date().toISOString(),
    location: {
      address: 'Test Address',
      coordinates: { lat: 28.6139, lng: 77.2090 }
    },
    vehicleType: '4 Wheeler',
    notes: 'Test booking',
  }
};

// Test results
const results = {
  passed: 0,
  failed: 0,
  errors: []
};

// Helper function to test endpoint
async function testEndpoint(method, endpoint, data = null, expectedStatus = 200) {
  try {
    const url = `${BASE_URL}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    const responseData = await response.json();

    if (response.status === expectedStatus) {
      results.passed++;
      console.log(`✅ ${method} ${endpoint} - Status: ${response.status}`);
      return { success: true, data: responseData };
    } else {
      results.failed++;
      console.log(`❌ ${method} ${endpoint} - Expected: ${expectedStatus}, Got: ${response.status}`);
      results.errors.push(`${method} ${endpoint}: Expected ${expectedStatus}, got ${response.status}`);
      return { success: false, data: responseData };
    }
  } catch (error) {
    results.failed++;
    console.log(`❌ ${method} ${endpoint} - Error: ${error.message}`);
    results.errors.push(`${method} ${endpoint}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Test all routes
async function testAllRoutes() {
  console.log('🚀 Starting comprehensive route testing...\n');

  // Health check
  console.log('📋 Testing Health Endpoints:');
  await testEndpoint('GET', '/health');

  // Services routes
  console.log('\n📋 Testing Services Routes:');
  await testEndpoint('GET', '/services');
  await testEndpoint('GET', '/services/popular');
  await testEndpoint('GET', '/services/top-services');
  await testEndpoint('GET', '/services/categories');
  await testEndpoint('GET', '/services/search?q=car');
  await testEndpoint('GET', '/services/categories/car%20wash');
  await testEndpoint('GET', '/services/stats', null, 401); // Should require auth

  // Bookings routes
  console.log('\n📋 Testing Bookings Routes:');
  await testEndpoint('GET', '/bookings', null, 401); // Should require auth
  await testEndpoint('GET', '/bookings/my-bookings', null, 401); // Should require auth
  await testEndpoint('POST', '/bookings', testData.booking, 401); // Should require auth

  // Notifications routes
  console.log('\n📋 Testing Notifications Routes:');
  await testEndpoint('GET', '/notifications', null, 401); // Should require auth
  await testEndpoint('GET', '/notifications/unread-count', null, 401); // Should require auth

  // Professional routes
  console.log('\n📋 Testing Professional Routes:');
  await testEndpoint('GET', '/professionals/profile', null, 401); // Should require auth
  await testEndpoint('GET', '/professionals/dashboard', null, 401); // Should require auth
  await testEndpoint('GET', '/professionals/jobs', null, 401); // Should require auth

  // Admin routes
  console.log('\n📋 Testing Admin Routes:');
  await testEndpoint('GET', '/admins/dashboard', null, 401); // Should require auth
  await testEndpoint('GET', '/admins/services', null, 401); // Should require auth
  await testEndpoint('GET', '/admins/bookings', null, 401); // Should require auth
  await testEndpoint('GET', '/admins/users', null, 401); // Should require auth

  // Auth routes
  console.log('\n📋 Testing Auth Routes:');
  await testEndpoint('GET', '/auth/me', null, 401); // Should require auth
  await testEndpoint('POST', '/auth/send-otp', { phone: '1234567890' });
  await testEndpoint('POST', '/auth/verify-otp', { phone: '1234567890', otp: '123456' });

  // User routes
  console.log('\n📋 Testing User Routes:');
  await testEndpoint('GET', '/users/profile', null, 401); // Should require auth
  await testEndpoint('PATCH', '/users/profile', { name: 'Test User' }, 401); // Should require auth

  // Vehicle routes
  console.log('\n📋 Testing Vehicle Routes:');
  await testEndpoint('GET', '/vehicles/my-vehicles', null, 401); // Should require auth
  await testEndpoint('POST', '/vehicles', { type: 'car', model: 'Test Car' }, 401); // Should require auth

  // Payment routes
  console.log('\n📋 Testing Payment Routes:');
  await testEndpoint('POST', '/payments/create-order', { amount: 100 }, 401); // Should require auth
  await testEndpoint('POST', '/payments/verify-payment', { orderId: 'test' }, 401); // Should require auth

  // Offer routes
  console.log('\n📋 Testing Offer Routes:');
  await testEndpoint('GET', '/offers');
  await testEndpoint('GET', '/offers/active');

  // Location routes
  console.log('\n📋 Testing Location Routes:');
  await testEndpoint('GET', '/locations/search?q=delhi');
  await testEndpoint('GET', '/locations/nearby?lat=28.6139&lng=77.2090');

  // Membership routes
  console.log('\n📋 Testing Membership Routes:');
  await testEndpoint('GET', '/memberships/plans');
  await testEndpoint('GET', '/memberships/my-membership', null, 401); // Should require auth

  // Print results
  console.log('\n📊 Test Results Summary:');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(2)}%`);

  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach(error => console.log(`  - ${error}`));
  }

  console.log('\n🎉 Route testing completed!');
}

// Run tests
testAllRoutes().catch(console.error);
