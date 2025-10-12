import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const bookingSchema = new mongoose.Schema({}, { strict: false, strictPopulate: false });
const Booking = mongoose.model('Booking', bookingSchema, 'bookings');

async function testBookingDetails() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    const bookingId = '68eb6ffa0243c75a026617f1';
    
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
    console.log('Customer:', booking.customer);
    console.log('Professional:', booking.professional);
    console.log('Services:', JSON.stringify(booking.services, null, 2));
    console.log('Location:', booking.location);
    console.log('Vehicle:', booking.vehicle);
    console.log('Status:', booking.status);
    console.log('Payment Status:', booking.paymentStatus);
    console.log('Total Amount:', booking.totalAmount);
    console.log('Scheduled Date:', booking.scheduledDate);
    console.log('Scheduled Time:', booking.scheduledTime);

    await mongoose.disconnect();
    console.log('\n✅ Test completed');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testBookingDetails();