import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import passport from './utils/passport.js';
import compression from 'compression';
import path from 'path';

// Import routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import locationRoutes from './routes/locationRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import firebaseRoutes from './routes/firebaseRoutes.js';
import membershipRoutes from './routes/membershipRoutes.js';
import professionalRoutes from './routes/professionalRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

// Import middleware
import { errorHandler } from './middleware/errorMiddleware.js';
import { responseEnhancer } from './middleware/responseMiddleware.js';
import { rawBodyMiddleware, saveRawBody } from './middleware/webhookMiddleware.js';
import { apiResponseMiddleware, errorHandlerMiddleware } from './utils/apiResponse.js';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Set security HTTP headers
app.use(helmet());

// Enable compression
app.use(compression());


// Rate limiting
const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes by default
  max: process.env.RATE_LIMIT_MAX || 100, // limit each IP to 100 requests per windowMs by default
  message: 'Too many requests from this IP, please try again after some time',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use('/api', limiter);

// Body parser with special handling for webhooks
app.use(rawBodyMiddleware);
app.use(saveRawBody);
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Response formatter middleware
app.use(apiResponseMiddleware);
app.use(responseEnhancer); // Keep for backward compatibility

// CORS Configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.CORS_ORIGIN || 'https://dashstream-app.com']
    : ['http://localhost:19000', 'http://localhost:19001', 'http://localhost:19002', 'exp://*',null],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors());

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'super-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      ttl: parseInt(process.env.SESSION_EXPIRY) / 1000 || 14 * 24 * 60 * 60, // Convert ms to seconds or default to 14 days
      touchAfter: 24 * 3600 // Only update session once per day unless data changes
    }),
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: parseInt(process.env.SESSION_EXPIRY) || 14 * 24 * 60 * 60 * 1000, // 14 days by default
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
    }
  })
);

// Initialize Passport and session
app.use(passport.initialize());
app.use(passport.session());

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/firebase', firebaseRoutes);
app.use('/api/membership', membershipRoutes);
app.use('/api/professional', professionalRoutes);
app.use('/api/admin', adminRoutes);

// Error handling middleware
app.use(errorHandlerMiddleware);
app.use(errorHandler); // Keep for backward compatibility

// Health check route
app.get('/api/health', (req, res) => {
  res.success({
    data: {
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0'
    },
    message: 'Server is running'
  });
});


// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  const __dirname = path.resolve();
  app.use(express.static(path.join(__dirname, 'public')));
  
  app.get('/', (req, res) => {
    res.send('DashStream API is running');
  });
}

// 404 route
app.all('*', (req, res, next) => {
  res.notFound(`Can't find ${req.originalUrl} on this server!`);
});

// Global error handler
app.use(errorHandlerMiddleware);
app.use(errorHandler); // Keep for backward compatibility

// Database connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    console.log('Please make sure MongoDB is installed and running, or update the MONGODB_URI in .env file.');
  });

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', err => {
  console.error('UNHANDLED REJECTION!  Shutting down...');
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

export default app;