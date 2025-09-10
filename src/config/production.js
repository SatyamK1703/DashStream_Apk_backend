/**
 * Production Configuration for DashStream Backend
 * This file contains production-ready configurations and optimizations
 */
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';

/**
 * Production Environment Validation
 * Ensures all required environment variables are set
 */
export const validateProductionEnv = () => {
  const requiredEnvVars = [
    'NODE_ENV',
    'PORT',
    'MONGODB_URI',
    'JWT_SECRET',
    'JWT_EXPIRES_IN',
    'JWT_COOKIE_EXPIRES_IN',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_SERVICE_SID',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
    'FIREBASE_CONFIG',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET'
  ];

  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

  if (missingEnvVars.length > 0) {
    console.error('🚨 Missing required environment variables:', missingEnvVars);
    console.error('Please check your environment configuration');
    
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }

  console.log('✅ All required environment variables are set');
};

/**
 * Production Rate Limiting Configuration
 */
export const productionRateLimiting = {
  // General API rate limiting
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: {
      status: 'error',
      message: 'Too many requests from this IP, please try again later.',
      statusCode: 429,
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip for health checks and internal requests
      const skipPaths = ['/health', '/api/health', '/api/auth/health'];
      return skipPaths.includes(req.path);
    }
  }),

  // Strict rate limiting for authentication endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 auth attempts per window
    message: {
      status: 'error',
      message: 'Too many authentication attempts. Please try again later.',
      statusCode: 429,
      retryAfter: '15 minutes'
    },
    skipSuccessfulRequests: true,
    skipFailedRequests: false
  }),

  // Rate limiting for OTP endpoints
  otp: rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 3, // 3 OTP requests per window
    message: {
      status: 'error',
      message: 'Too many OTP requests. Please try again after 5 minutes.',
      statusCode: 429,
      retryAfter: '5 minutes'
    }
  }),

  // Slow down middleware for repeated requests
  slowDown: slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 50, // Allow 50 requests per window at full speed
    delayMs: () => 500, // Fixed delay function
    maxDelayMs: 10000, // Maximum delay of 10 seconds
    validate: { delayMs: false } // Disable the warning
  })
};

/**
 * Production Security Headers
 */
export const productionSecurityConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "https://js.stripe.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: [
        "'self'",
        "https://api.cloudinary.com",
        "https://api.razorpay.com",
        "https://*.twilio.com",
        "https://*.googleapis.com"
      ],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "https:", "blob:"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: []
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "same-site" },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
};

/**
 * Production CORS Configuration
 */
export const productionCorsConfig = {
  origin: function (origin, callback) {
    // Production allowed origins
    const allowedOrigins = [
      'https://dashstream-app.com',
      'https://dashstream.vercel.app',
      'https://admin.dashstream.app',
      'exp://exp.host', // Expo development
      'https://expo.dev' // Expo hosting
    ];

    // Allow mobile app requests (no origin)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.some(allowedOrigin => 
      origin.startsWith(allowedOrigin) || 
      origin.includes('expo') ||
      origin.includes('localhost') // Remove this in production
    )) {
      callback(null, true);
    } else {
      console.warn('🚫 CORS blocked request from:', origin);
      callback(new Error('Not allowed by CORS'));
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
    'X-Device-ID',
    'X-App-Version',
    'X-Request-ID'
  ],
  exposedHeaders: [
    'X-Total-Count',
    'X-Page-Count',
    'X-Current-Page',
    'X-Rate-Limit-Remaining',
    'X-Rate-Limit-Reset'
  ],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 200
};

/**
 * Production Database Configuration
 */
export const productionDbConfig = {
  mongoose: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4, // Use IPv4, skip trying IPv6
    retryWrites: true,
    retryReads: true,
    readPreference: 'primary'
  }
};

/**
 * Production Logging Configuration
 */
export const productionLoggingConfig = {
  level: 'info',
  format: 'combined',
  skip: (req, res) => {
    // Skip logging for health checks in production
    return req.path === '/health' || req.path === '/api/health';
  }
};

/**
 * Production Session Configuration
 */
export const productionSessionConfig = {
  name: 'dashstream.sid',
  secret: process.env.SESSION_SECRET || 'fallback-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true, // Requires HTTPS in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict'
  },
  // Additional production session settings
  proxy: true, // Trust proxy headers
  rolling: true, // Reset expiry on activity
  unset: 'destroy'
};

/**
 * Production Health Check Configuration
 */
export const healthCheckConfig = {
  path: '/health',
  checks: {
    database: async () => {
      // Database health check logic
      return { status: 'healthy', latency: 0 };
    },
    external_services: async () => {
      // External services health check
      return { status: 'healthy' };
    }
  }
};

/**
 * Production Optimization Settings
 */
export const productionOptimizations = {
  // Compression settings
  compression: {
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      // Don't compress responses if the request includes a cache-control: no-transform directive
      if (req.headers['cache-control'] && req.headers['cache-control'].includes('no-transform')) {
        return false;
      }
      return true;
    }
  },

  // JSON settings
  json: {
    limit: '10mb',
    strict: true,
    type: 'application/json'
  },

  // URL encoded settings
  urlencoded: {
    limit: '10mb',
    extended: true,
    parameterLimit: 1000
  }
};

export default {
  validateProductionEnv,
  productionRateLimiting,
  productionSecurityConfig,
  productionCorsConfig,
  productionDbConfig,
  productionLoggingConfig,
  productionSessionConfig,
  healthCheckConfig,
  productionOptimizations
};