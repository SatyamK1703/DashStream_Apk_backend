// test-connection.js
// Simple script to test backend connectivity and Twilio configuration

import dotenv from 'dotenv';
import twilio from 'twilio';

// Load environment variables
dotenv.config();

console.log('🔍 Testing Backend Configuration...\n');

// Test environment variables
console.log('📋 Environment Variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ Set' : '❌ Missing');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ Missing');

// Test Twilio configuration
console.log('\n📱 Twilio Configuration:');
console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? '✅ Set' : '❌ Missing');
console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? '✅ Set' : '❌ Missing');
console.log('TWILIO_SERVICE_SID:', process.env.TWILIO_SERVICE_SID ? '✅ Set' : '❌ Missing');

// Test Twilio connection
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log('\n🔗 Testing Twilio Connection...');
    
    // Test account info
    client.api.accounts(process.env.TWILIO_ACCOUNT_SID)
      .fetch()
      .then(account => {
        console.log('✅ Twilio connection successful');
        console.log('Account Status:', account.status);
      })
      .catch(error => {
        console.log('❌ Twilio connection failed:', error.message);
      });
      
  } catch (error) {
    console.log('❌ Twilio initialization failed:', error.message);
  }
} else {
  console.log('❌ Twilio credentials missing');
}

console.log('\n🚀 Configuration check complete!');
console.log('\nTo start the server:');
console.log('npm run dev (for development)');
console.log('npm start (for production)');