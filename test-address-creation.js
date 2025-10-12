#!/usr/bin/env node

/**
 * Test script to verify address creation works
 * Run with: node test-address-creation.js
 */

import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:5000/api';

// Test data
const testAddress = {
    type: 'home',
    title: 'Test Address',
    addressLine1: '123 Test Street',
    addressLine2: 'Apt 4B',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400001',
    country: 'IN',
    coordinates: {
        latitude: 19.0760,
        longitude: 72.8777
    },
    isDefault: true
};

async function testAddressCreation() {
    try {
        console.log('🧪 Testing address creation...');
        console.log('📤 Sending data:', JSON.stringify(testAddress, null, 2));

        const response = await fetch(`${API_BASE_URL}/addresses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer YOUR_TEST_TOKEN_HERE' // Replace with actual token
            },
            body: JSON.stringify(testAddress)
        });

        console.log('📊 Response status:', response.status);
        console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));

        const responseText = await response.text();
        console.log('📤 Response body:', responseText);

        if (response.ok) {
            console.log('✅ Address creation test passed!');
        } else {
            console.log('❌ Address creation test failed!');
        }

    } catch (error) {
        console.error('💥 Test error:', error.message);
    }
}

// Run the test
testAddressCreation();
