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
import offerRoutes from './routes/offerRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import locationRoutes from './routes/locationRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import membershipRoutes from './routes/membershipRoutes.js';
import professionalRoutes from './routes/professionalRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import vehicleRoutes from './routes/vehicleRoutes.js';

// Import middleware
import { errorHandler } from './middleware/errorMiddleware.js';
import { responseEnhancer } from './middleware/responseMiddleware.js';
import { rawBodyMiddleware, saveRawBody } from './middleware/webhookMiddleware.js';
import { apiResponseMiddleware, errorHandlerMiddleware } from './utils/apiResponse.js';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();



// Enable compression
app.use(compression());

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false
}));

// Rate limiting for security
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // limit each IP to 100 requests per windowMs in production
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    statusCode: 429
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/health';
  }
});

// Apply rate limiting to all API routes
app.use('/api/', limiter);

// Special rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    statusCode: 429
  },
  skipSuccessfulRequests: true, // Don't count successful requests
});

app.use('/api/auth/', authLimiter);

// Body parser with special handling for webhooks
app.use(rawBodyMiddleware);
app.use(saveRawBody);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Response formatter middleware
app.use(apiResponseMiddleware);
app.use(responseEnhancer); // Keep for backward compatibility


// Enhanced CORS Configuration for Frontend Integration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? [
          process.env.CORS_ORIGIN || 'https://dashstream-app.com',
          'https://dashstream-frontend.vercel.app',
          'https://dashstream-admin.vercel.app',
          'https://dash-stream-apk-backend.vercel.app',
          'exp://*',
          'http://*',
          'https://*',
          null
        ]
      : [
          'http://localhost:19000', 
          'http://localhost:19001', 
          'http://localhost:19002', 
          'http://localhost:3000',
          'http://localhost:8081',
          'http://localhost:5000',
          'http://192.168.*',
          'http://10.*',
          'http://172.*',
          'exp://*',
          '*',
          null
        ];
    
    // Always allow for mobile apps and localhost
    if (allowedOrigins.some(allowed => {
      if (allowed === '*') return true;
      if (allowed.endsWith('*')) {
        const base = allowed.slice(0, -1);
        return origin && origin.startsWith(base);
      }
      return origin === allowed;
    })) {
      callback(null, true);
    } else {
      console.log('CORS Info - Origin:', origin);
      callback(null, true); // Allow all in development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'X-Client-Version', 
    'X-Platform', 
    'X-Request-Time',
    'X-API-Key',
    'X-Device-ID',
    'X-App-Version'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count', 'X-Current-Page'],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 200
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
app.use('/api/offers', offerRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/membership', membershipRoutes);
app.use('/api/professional', professionalRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/vehicles', vehicleRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'DashStream API is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0',
    uptime: Math.floor(process.uptime()),
    memory: process.memoryUsage(),
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'DashStream API is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0',
    uptime: Math.floor(process.uptime()),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    services: {
      database: mongoose.connection.readyState === 1,
      redis: false, // Update this if you're using Redis
      external_apis: true // Update based on your external dependencies
    }
  });
});

app.use(errorHandlerMiddleware);
app.use(errorHandler);

if (process.env.NODE_ENV === 'production') {

  const __dirname = path.resolve();
  app.use(express.static(path.join(__dirname, 'public')));
  
  app.get('/', (req, res) => {
    res.send('DashStream API is running');
  });
}

// 404 route handler
app.all('*', (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Can't find ${req.originalUrl} on this server!`,
    statusCode: 404
  });
});


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
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '0.0.0.0';
const server = app.listen(PORT, HOST, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on ${HOST}:${PORT}`);
  console.log(`Local access: http://localhost:${PORT}`);
  console.log(`Network access: http://192.168.1.10:${PORT}`);
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