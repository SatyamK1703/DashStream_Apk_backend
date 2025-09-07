import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Offer from '../src/models/offerModel.js';
import User from '../src/models/userModel.js';

// Load environment variables
dotenv.config();

// Sample offers data
const sampleOffers = [
  {
    title: 'Welcome Offer - 25% Off',
    description: 'Get 25% off on your first car wash service. Valid for new customers only.',
    discount: 25,
    discountType: 'percentage',
    maxDiscountAmount: 200,
    minOrderAmount: 100,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    offerCode: 'WELCOME25',
    usageLimit: 100,
    userUsageLimit: 1,
    applicableCategories: ['car wash'],
    vehicleType: 'Both',
    isActive: true,
    isFeatured: true,
    priority: 10,
    terms: 'Valid for new customers only. Cannot be combined with other offers.'
  },
  {
    title: 'Premium Detailing Special',
    description: 'Save ₹500 on premium car detailing services. Limited time offer!',
    discount: 500,
    discountType: 'fixed',
    minOrderAmount: 2000,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
    offerCode: 'DETAIL500',
    usageLimit: 50,
    userUsageLimit: 1,
    applicableCategories: ['detailing'],
    vehicleType: 'Both',
    isActive: true,
    isFeatured: true,
    priority: 8,
    terms: 'Valid on premium detailing services only. Minimum order value ₹2000.'
  },
  {
    title: 'Weekend Special - 15% Off',
    description: 'Enjoy 15% discount on all services during weekends.',
    discount: 15,
    discountType: 'percentage',
    maxDiscountAmount: 150,
    minOrderAmount: 200,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
    offerCode: 'WEEKEND15',
    usageLimit: null, // Unlimited usage
    userUsageLimit: 2, // User can use twice
    applicableCategories: ['car wash', 'bike wash', 'maintenance'],
    vehicleType: 'Both',
    isActive: true,
    isFeatured: false,
    priority: 5,
    terms: 'Valid on weekends only (Saturday & Sunday). Maximum 2 uses per customer.'
  },
  {
    title: 'Bike Wash Bonanza',
    description: 'Special 20% off on all bike wash services. Keep your ride clean!',
    discount: 20,
    discountType: 'percentage',
    maxDiscountAmount: 100,
    minOrderAmount: 50,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
    offerCode: 'BIKEWASH20',
    usageLimit: 200,
    userUsageLimit: 3,
    applicableCategories: ['bike wash'],
    vehicleType: '2 Wheeler',
    isActive: true,
    isFeatured: false,
    priority: 6,
    terms: 'Valid for 2-wheeler services only. Can be used up to 3 times per customer.'
  },
  {
    title: 'Maintenance Monday',
    description: 'Get ₹300 off on vehicle maintenance services every Monday.',
    discount: 300,
    discountType: 'fixed',
    minOrderAmount: 1500,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
    offerCode: 'MONDAY300',
    usageLimit: null,
    userUsageLimit: 4, // Once per month for 4 months
    applicableCategories: ['maintenance'],
    vehicleType: 'Both',
    isActive: true,
    isFeatured: false,
    priority: 4,
    terms: 'Valid on Mondays only. Applicable on maintenance services with minimum order ₹1500.'
  },
  {
    title: 'Loyalty Reward - 30% Off',
    description: 'Exclusive offer for our loyal customers. Get 30% off on any service!',
    discount: 30,
    discountType: 'percentage',
    maxDiscountAmount: 500,
    minOrderAmount: 300,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    offerCode: 'LOYALTY30',
    usageLimit: 25,
    userUsageLimit: 1,
    applicableCategories: ['car wash', 'bike wash', 'detailing', 'maintenance', 'customization'],
    vehicleType: 'Both',
    isActive: true,
    isFeatured: true,
    priority: 9,
    terms: 'Exclusive for loyal customers. Limited time offer - expires in 7 days!'
  }
];

async function seedOffers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find an admin user to assign as creator (or create a default one)
    let adminUser = await User.findOne({ role: 'admin' });
    
    if (!adminUser) {
      console.log('No admin user found. Creating a default admin user...');
      adminUser = await User.create({
        name: 'System Admin',
        email: 'admin@dashstream.com',
        phone: '+1234567890',
        role: 'admin',
        isVerified: true
      });
      console.log('Default admin user created');
    }

    // Clear existing offers
    await Offer.deleteMany({});
    console.log('Cleared existing offers');

    // Add createdBy field to each offer
    const offersWithCreator = sampleOffers.map(offer => ({
      ...offer,
      createdBy: adminUser._id
    }));

    // Insert sample offers
    const createdOffers = await Offer.insertMany(offersWithCreator);
    console.log(`✅ Successfully created ${createdOffers.length} sample offers:`);
    
    createdOffers.forEach((offer, index) => {
      console.log(`${index + 1}. ${offer.title} (${offer.offerCode}) - ${offer.discount}${offer.discountType === 'percentage' ? '%' : '₹'} off`);
    });

    console.log('\n🎉 Offer seeding completed successfully!');
    console.log('\nYou can now:');
    console.log('1. View offers: GET /api/offers/active');
    console.log('2. Get featured offers: GET /api/offers/featured');
    console.log('3. Validate offer codes: GET /api/offers/validate/WELCOME25');
    console.log('4. Use offers in bookings: POST /api/offers/:id/use');

  } catch (error) {
    console.error('❌ Error seeding offers:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the seed function
seedOffers();