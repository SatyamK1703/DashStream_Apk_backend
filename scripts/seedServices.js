import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Service from '../src/models/serviceModel.js';

// Load environment variables
dotenv.config();

// Sample services data
const sampleServices = [
  {
    title: 'Premium Car Wash',
    description: 'Complete exterior and interior car wash with premium products',
    category: 'car wash',
    vehicleType: '4 Wheeler',
    price: 299,
    duration: '45 mins',
    features: [
      'Exterior wash and wax',
      'Interior vacuum cleaning',
      'Dashboard polishing',
      'Tire cleaning',
      'Window cleaning'
    ],
    isActive: true,
    isPopular: true,
    rating: 4.8,
    reviewCount: 156
  },
  {
    title: 'Basic Car Wash',
    description: 'Essential car wash service for regular maintenance',
    category: 'car wash',
    vehicleType: '4 Wheeler',
    price: 199,
    duration: '30 mins',
    features: [
      'Exterior wash',
      'Basic interior cleaning',
      'Window cleaning'
    ],
    isActive: true,
    isPopular: true,
    rating: 4.5,
    reviewCount: 89
  },
  {
    title: 'Bike Wash & Polish',
    description: 'Complete bike cleaning and polishing service',
    category: 'bike wash',
    vehicleType: '2 Wheeler',
    price: 149,
    duration: '25 mins',
    features: [
      'Complete bike wash',
      'Chain cleaning',
      'Polish application',
      'Tire cleaning'
    ],
    isActive: true,
    isPopular: true,
    rating: 4.7,
    reviewCount: 73
  },
  {
    title: 'Full Car Detailing',
    description: 'Professional car detailing with paint protection',
    category: 'detailing',
    vehicleType: '4 Wheeler',
    price: 1299,
    duration: '3 hours',
    features: [
      'Paint correction',
      'Ceramic coating',
      'Interior deep cleaning',
      'Engine bay cleaning',
      'Headlight restoration'
    ],
    isActive: true,
    isPopular: false,
    rating: 4.9,
    reviewCount: 42
  },
  {
    title: 'Oil Change Service',
    description: 'Complete engine oil change with filter replacement',
    category: 'maintenance',
    vehicleType: 'Both',
    price: 899,
    duration: '1 hour',
    features: [
      'Engine oil replacement',
      'Oil filter change',
      'Basic inspection',
      'Fluid level check'
    ],
    isActive: true,
    isPopular: true,
    rating: 4.6,
    reviewCount: 128
  },
  {
    title: 'Tire Rotation & Balancing',
    description: 'Professional tire rotation and wheel balancing service',
    category: 'maintenance',
    vehicleType: '4 Wheeler',
    price: 599,
    duration: '45 mins',
    features: [
      'Tire rotation',
      'Wheel balancing',
      'Tire pressure check',
      'Visual inspection'
    ],
    isActive: true,
    isPopular: false,
    rating: 4.4,
    reviewCount: 67
  },
  {
    title: 'Custom Paint Job',
    description: 'Professional custom paint and graphics service',
    category: 'customization',
    vehicleType: 'Both',
    price: 5999,
    duration: '8 hours',
    features: [
      'Custom paint design',
      'Graphics application',
      'Clear coat protection',
      'Quality guarantee'
    ],
    isActive: true,
    isPopular: false,
    rating: 4.8,
    reviewCount: 23
  },
  {
    title: 'Express Bike Service',
    description: 'Quick bike maintenance and basic service',
    category: 'maintenance',
    vehicleType: '2 Wheeler',
    price: 399,
    duration: '30 mins',
    features: [
      'Engine oil check',
      'Chain lubrication',
      'Brake inspection',
      'Basic tune-up'
    ],
    isActive: true,
    isPopular: true,
    rating: 4.5,
    reviewCount: 94
  }
];

async function seedServices() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Drop the entire collection to remove any old indexes
    await Service.collection.drop().catch(() => console.log('Collection does not exist, creating new one'));
    console.log('Dropped services collection');

    // Insert sample services
    const createdServices = await Service.insertMany(sampleServices);
    console.log(`✅ Successfully created ${createdServices.length} sample services:`);
    
    createdServices.forEach((service, index) => {
      console.log(`${index + 1}. ${service.title} (${service.category}) - ₹${service.price}`);
    });

    console.log('\n🎉 Service seeding completed successfully!');
    console.log('\nYou can now:');
    console.log('1. View services: GET /api/services');
    console.log('2. Get popular services: GET /api/services/popular');
    console.log('3. Filter by category: GET /api/services?category=car wash');
    console.log('4. Filter by vehicle type: GET /api/services?vehicleType=4 Wheeler');

  } catch (error) {
    console.error('❌ Error seeding services:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the seed function
seedServices();