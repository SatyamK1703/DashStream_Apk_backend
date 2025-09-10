// Test script to verify API authentication
import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:5000/api';

async function testAuthFlow() {
  try {
    console.log('🔄 Testing API Authentication Flow...\n');

    // Test 1: Send OTP
    console.log('1. Testing OTP send...');
    const otpResponse = await fetch(`${API_BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: '+919341526497' // Test phone number
      })
    });

    const otpResult = await otpResponse.json();
    console.log('OTP Response:', otpResult);

    // Test 2: Check if services endpoint works (public)
    console.log('\n2. Testing public services endpoint...');
    const servicesResponse = await fetch(`${API_BASE_URL}/services`);
    const servicesResult = await servicesResponse.json();
    console.log('Services Response Status:', servicesResponse.status);
    console.log('Services Count:', servicesResult.results || 'No results field');

    // Test 3: Try accessing protected endpoint without token
    console.log('\n3. Testing protected endpoint without token...');
    const userMeResponse = await fetch(`${API_BASE_URL}/users/me`);
    const userMeResult = await userMeResponse.json();
    console.log('User/me Response Status:', userMeResponse.status);
    console.log('User/me Response:', userMeResult);

    // Test 4: Try accessing offers endpoint without token
    console.log('\n4. Testing offers endpoint without token...');
    const offersResponse = await fetch(`${API_BASE_URL}/offers`);
    const offersResult = await offersResponse.json();
    console.log('Offers Response Status:', offersResponse.status);
    console.log('Offers Response:', offersResult);

  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

testAuthFlow();
