import mongoose from 'mongoose';
import dotenv from 'dotenv';
import QuickFix from '../src/models/QuickFix.js';

dotenv.config({ path: './.env' });

const fixes = [
  { label: 'Hybrid Ceramic', image: 'https://via.placeholder.com/150' },
  { label: 'Odor Eliminator', image: 'https://via.placeholder.com/150' },
  { label: 'Pet Hair Removal', image: 'https://via.placeholder.com/150' },
  { label: 'Roof Cleaning', image: 'https://via.placeholder.com/150' },
  { label: 'Seat Cleaning', image: 'https://via.placeholder.com/150' },
  { label: 'Underbody Cleaning', image: 'https://via.placeholder.com/150' },
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await QuickFix.deleteMany({});
    await QuickFix.insertMany(fixes);
    console.log('Data seeded successfully');
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    mongoose.connection.close();
  }
};

seedDB();
