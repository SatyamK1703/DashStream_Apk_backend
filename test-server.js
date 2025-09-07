// Simple test server without MongoDB dependency
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Basic middleware
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mock data for testing
const mockServices = [
  {
    id: '1',
    title: 'Car Wash',
    description: 'Complete car wash service',
    category: 'car wash',
    price: 500,
    duration: '30 mins',
    vehicleType: '4 Wheeler',
    isActive: true
  },
  {
    id: '2',
    title: 'Bike Service',
    description: 'Complete bike service',
    category: 'bike service',
    price: 300,
    duration: '45 mins',
    vehicleType: '2 Wheeler',
    isActive: true
  }
];

const mockOffers = [
  {
    id: '1',
    title: 'Summer Special',
    description: '20% off on all services',
    discount: 20,
    isActive: true,
    isFeatured: true
  }
];

const mockBookings = [
  {
    id: '1',
    serviceId: '1',
    userId: 'test-user',
    status: 'confirmed',
    scheduledDate: new Date().toISOString(),
    totalAmount: 500
  }
];

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      status: 'healthy'
    },
    message: 'Test server is running'
  });
});

// Mock authentication routes
app.post('/api/auth/send-otp', (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({
      success: false,
      error: 'Phone number is required'
    });
  }
  
  res.json({
    success: true,
    message: 'OTP sent successfully',
    data: { phone }
  });
});

app.post('/api/auth/verify-otp', (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) {
    return res.status(400).json({
      success: false,
      error: 'Phone number and OTP are required'
    });
  }
  
  // Mock successful verification
  const token = 'mock-jwt-token-' + Date.now();
  const user = {
    id: 'test-user-id',
    phone,
    name: 'Test User',
    role: 'customer'
  };
  
  res.json({
    success: true,
    message: 'OTP verified successfully',
    data: {
      token,
      user
    }
  });
});

// Mock services routes
app.get('/api/services', (req, res) => {
  res.json({
    success: true,
    data: mockServices,
    message: 'Services retrieved successfully'
  });
});

app.get('/api/services/popular', (req, res) => {
  res.json({
    success: true,
    data: mockServices.slice(0, 2),
    message: 'Popular services retrieved successfully'
  });
});

app.get('/api/services/:id', (req, res) => {
  const service = mockServices.find(s => s.id === req.params.id);
  if (!service) {
    return res.status(404).json({
      success: false,
      error: 'Service not found'
    });
  }
  
  res.json({
    success: true,
    data: service,
    message: 'Service retrieved successfully'
  });
});

// Mock offers routes
app.get('/api/offers/active', (req, res) => {
  res.json({
    success: true,
    data: mockOffers,
    message: 'Active offers retrieved successfully'
  });
});

app.get('/api/offers/featured', (req, res) => {
  const featuredOffers = mockOffers.filter(offer => offer.isFeatured);
  res.json({
    success: true,
    data: featuredOffers,
    message: 'Featured offers retrieved successfully'
  });
});

// Mock user routes
app.get('/api/users/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
  
  res.json({
    success: true,
    data: {
      id: 'test-user-id',
      phone: '+919876543210',
      name: 'Test User',
      role: 'customer'
    },
    message: 'User profile retrieved successfully'
  });
});

app.patch('/api/users/update-profile', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
  
  res.json({
    success: true,
    data: {
      id: 'test-user-id',
      phone: '+919876543210',
      name: req.body.name || 'Test User',
      role: 'customer'
    },
    message: 'Profile updated successfully'
  });
});

// Mock bookings routes
app.get('/api/bookings/my-bookings', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
  
  res.json({
    success: true,
    data: mockBookings,
    message: 'User bookings retrieved successfully'
  });
});

app.get('/api/bookings/:id', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
  
  const booking = mockBookings.find(b => b.id === req.params.id);
  if (!booking) {
    return res.status(404).json({
      success: false,
      error: 'Booking not found'
    });
  }
  
  res.json({
    success: true,
    data: booking,
    message: 'Booking retrieved successfully'
  });
});

app.post('/api/bookings', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
  
  const newBooking = {
    id: Date.now().toString(),
    ...req.body,
    status: 'confirmed',
    createdAt: new Date().toISOString()
  };
  
  mockBookings.push(newBooking);
  
  res.status(201).json({
    success: true,
    data: { booking: newBooking },
    message: 'Booking created successfully'
  });
});

// Mock admin routes
app.get('/api/admin/dashboard', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
  
  res.json({
    success: true,
    data: {
      totalBookings: mockBookings.length,
      totalRevenue: mockBookings.reduce((sum, b) => sum + b.totalAmount, 0),
      totalUsers: 1,
      totalServices: mockServices.length
    },
    message: 'Dashboard data retrieved successfully'
  });
});

app.get('/api/admin/bookings', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
  
  res.json({
    success: true,
    data: mockBookings,
    message: 'All bookings retrieved successfully'
  });
});

app.get('/api/admin/users', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
  
  res.json({
    success: true,
    data: [{
      id: 'test-user-id',
      phone: '+919876543210',
      name: 'Test User',
      role: 'customer'
    }],
    message: 'All users retrieved successfully'
  });
});

app.post('/api/admin/services', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
  
  const newService = {
    id: Date.now().toString(),
    ...req.body,
    isActive: true,
    createdAt: new Date().toISOString()
  };
  
  mockServices.push(newService);
  
  res.status(201).json({
    success: true,
    data: { service: newService },
    message: 'Service created successfully'
  });
});

// 404 handler
app.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Can't find ${req.originalUrl} on this server!`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Test Server running on http://${HOST}:${PORT}`);
  console.log(`📊 Health check: http://${HOST}:${PORT}/api/health`);
  console.log(`🔧 API Base URL: http://${HOST}:${PORT}/api`);
  console.log('='.repeat(50));
  console.log('Test server is ready for integration tests!');
  console.log('This server provides mock data without requiring MongoDB.');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Test server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Test server closed');
    process.exit(0);
  });
});

export default app;
