import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const bookingSchema = new mongoose.Schema({}, { strict: false });
const Booking = mongoose.model('Booking', bookingSchema);

async function checkBookings() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');

    const count = await Booking.countDocuments();
    console.log('Total bookings:', count);

    const bookings = await Booking.find().limit(2);
    console.log('\nFirst 2 bookings:');
    bookings.forEach((booking, index) => {
      console.log(`\nBooking ${index + 1}:`);
      console.log('ID:', booking._id);
      console.log('Customer:', booking.customer);
      console.log('Professional:', booking.professional);
      console.log('Service:', booking.service);
      console.log('Status:', booking.status);
      console.log('Total Amount:', booking.totalAmount);
    });

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkBookings();