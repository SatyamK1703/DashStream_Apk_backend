import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Booking from './src/models/bookingModel.js';
import User from './src/models/userModel.js';
import Service from './src/models/serviceModel.js';

dotenv.config();

async function testBookingDetails() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    const bookingId = '68eb6ffa0243c75a026617f1';
    
    console.log('\n🔍 Testing populate...');
    const booking = await Booking.findById(bookingId)
      .populate('customer', 'name phone email')
      .populate('professional', 'name phone email')
      .populate('services.serviceId', 'name description price');

    if (!booking) {
      console.log('❌ Booking not found');
      process.exit(1);
    }

    console.log('\n📋 Booking Details:');
    console.log('ID:', booking._id);
    console.log('Customer Type:', typeof booking.customer, booking.customer);
    console.log('Professional:', booking.professional);
    console.log('Services:', JSON.stringify(booking.services, null, 2));
    console.log('Location:', booking.location);
    console.log('Status:', booking.status);

    // Try to manually fetch customer
    if (booking.customer && typeof booking.customer === 'object' && booking.customer._id) {
      console.log('\n✅ Customer is populated');
    } else {
      console.log('\n⚠️ Customer is NOT populated, trying manual fetch...');
      const customerId = booking.customer;
      const customer = await User.findById(customerId);
      console.log('Manual customer fetch:', customer?.name);
    }

    await mongoose.disconnect();
    console.log('\n✅ Test completed');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testBookingDetails();