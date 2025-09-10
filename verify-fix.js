/**
 * Quick verification script for the authentication fix
 * This script simulates what your mobile app is doing
 */
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000';

async function testAuthFix() {
  console.log('🔍 Testing Authentication Fix...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing server health...');
    const healthResponse = await fetch(`${API_BASE}/health`);
    const healthData = await healthResponse.json();
    
    if (healthResponse.ok) {
      console.log('   ✅ Server is running');
    } else {
      console.log('   ❌ Server health check failed');
      return;
    }

    // Test 2: Auth service health
    console.log('\n2. Testing auth service health...');
    const authHealthResponse = await fetch(`${API_BASE}/api/auth/health`);
    const authHealthData = await authHealthResponse.json();
    
    if (authHealthResponse.ok) {
      console.log('   ✅ Auth service is healthy');
    } else {
      console.log('   ❌ Auth service health check failed');
    }

    // Test 3: /users/me without authentication (this was failing before)
    console.log('\n3. Testing /users/me WITHOUT authentication token...');
    const meResponse = await fetch(`${API_BASE}/api/users/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
        // No Authorization header - simulating what your mobile app was doing
      }
    });
    
    const meData = await meResponse.json();
    console.log('   Status:', meResponse.status);
    console.log('   Response:', JSON.stringify(meData, null, 2));

    if (meResponse.ok && meData.data.isGuest) {
      console.log('   ✅ FIXED! /users/me now returns guest status instead of 401 error');
      console.log('   ✅ Your mobile app will no longer show "session expired" alerts on startup');
    } else if (meResponse.status === 401) {
      console.log('   ❌ Still returning 401 - fix not working yet');
    } else {
      console.log('   ⚠️  Unexpected response - check server logs');
    }

    // Test 4: Other endpoints that should work
    console.log('\n4. Testing public endpoints...');
    const servicesResponse = await fetch(`${API_BASE}/api/services`);
    if (servicesResponse.ok) {
      console.log('   ✅ /api/services endpoint working');
    } else {
      console.log('   ⚠️  /api/services returned', servicesResponse.status);
    }

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Cannot connect to server at http://localhost:5000');
      console.log('Please start your server first with: npm run quick-start');
    } else {
      console.log('❌ Error testing:', error.message);
    }
  }
}

console.log('🚀 DashStream Authentication Fix Verification\n');
console.log('This script tests if the "session expired" issue is fixed.\n');

testAuthFix();