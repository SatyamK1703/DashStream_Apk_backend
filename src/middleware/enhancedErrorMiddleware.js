// Enhanced Error Handling Middleware for Frontend Integration
import  AppError  from '../utils/appError.js';

// Error types for better categorization
const ERROR_TYPES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  CONFLICT_ERROR: 'CONFLICT_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR'
};

// Error codes mapping for frontend
const ERROR_CODES = {
  // Authentication & Authorization
  'AUTH-001': 'Invalid credentials',
  'AUTH-002': 'Token expired',
  'AUTH-003': 'Access denied',
  'AUTH-004': 'Account not verified',
  
  // Validation
  'VAL-001': 'Required field missing',
  'VAL-002': 'Invalid format',
  'VAL-003': 'Value out of range',
  'VAL-004': 'Duplicate entry',
  
  // Business Logic
  'BIZ-001': 'Booking not available',
  'BIZ-002': 'Payment failed',
  'BIZ-003': 'Service unavailable',
  'BIZ-004': 'Insufficient permissions',
  
  // System
  'SYS-001': 'Database connection failed',
  'SYS-002': 'External service unavailable',
  'SYS-003': 'Rate limit exceeded',
  'SYS-004': 'Internal server error'
};

// Enhanced error handler
export const enhancedErrorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.stack = err.stack;

  // Log error for debugging
  console.error('Error Details:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new AppError(message, 404, ERROR_TYPES.NOT_FOUND_ERROR, 'SYS-001');
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} already exists`;
    error = new AppError(message, 400, ERROR_TYPES.CONFLICT_ERROR, 'VAL-004');
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(val => val.message);
    const message = `Validation Error: ${errors.join(', ')}`;
    error = new AppError(message, 400, ERROR_TYPES.VALIDATION_ERROR, 'VAL-001');
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new AppError(message, 401, ERROR_TYPES.AUTHENTICATION_ERROR, 'AUTH-001');
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new AppError(message, 401, ERROR_TYPES.AUTHENTICATION_ERROR, 'AUTH-002');
  }

  // Rate limiting errors
  if (err.status === 429) {
    const message = 'Too many requests';
    error = new AppError(message, 429, ERROR_TYPES.RATE_LIMIT_ERROR, 'SYS-003');
  }

  // Network/Connection errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    const message = 'Service temporarily unavailable';
    error = new AppError(message, 503, ERROR_TYPES.NETWORK_ERROR, 'SYS-002');
  }

  // Database connection errors
  if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
    const message = 'Database connection failed';
    error = new AppError(message, 503, ERROR_TYPES.DATABASE_ERROR, 'SYS-001');
  }

  // Send error response
  sendErrorResponse(error, req, res);
};

// Send error response with proper formatting
const sendErrorResponse = (err, req, res) => {
  // Operational errors: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.errorCode || 'UNKNOWN',
        type: err.errorType || 'INTERNAL_SERVER_ERROR',
        statusCode: err.statusCode,
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
        method: req.method,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
      }
    });
  } else {
    // Programming or unknown errors: don't leak error details
    console.error('ERROR 💥', err);

    res.status(500).json({
      success: false,
      error: {
        message: 'Something went wrong!',
        code: 'SYS-004',
        type: 'INTERNAL_SERVER_ERROR',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
        method: req.method,
        ...(process.env.NODE_ENV === 'development' && { 
          message: err.message,
          stack: err.stack 
        })
      }
    });
  }
};

// Async error wrapper
export const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// Custom error classes
export class ValidationError extends AppError {
  constructor(message, field = null) {
    super(message, 400, ERROR_TYPES.VALIDATION_ERROR, 'VAL-001');
    this.field = field;
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, ERROR_TYPES.AUTHENTICATION_ERROR, 'AUTH-001');
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, ERROR_TYPES.AUTHORIZATION_ERROR, 'AUTH-003');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, ERROR_TYPES.NOT_FOUND_ERROR, 'SYS-001');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, ERROR_TYPES.CONFLICT_ERROR, 'VAL-004');
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429, ERROR_TYPES.RATE_LIMIT_ERROR, 'SYS-003');
  }
}

export class ExternalServiceError extends AppError {
  constructor(message = 'External service error') {
    super(message, 502, ERROR_TYPES.EXTERNAL_SERVICE_ERROR, 'SYS-002');
  }
}

// Request validation middleware
export const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      const message = error.details.map(detail => detail.message).join(', ');
      return next(new ValidationError(message));
    }
    next();
  };
};

// Security headers middleware
export const securityHeaders = (req, res, next) => {
  // Remove powered by header
  res.removeHeader('X-Powered-By');
  
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' https:; " +
    "frame-ancestors 'none';"
  );
  
  next();
};

// Request logging middleware
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    };
    
    if (res.statusCode >= 400) {
      console.error('Request Error:', logData);
    } else {
      console.log('Request:', logData);
    }
  });
  
  next();
};

// API response standardization
export const standardizeResponse = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Only standardize JSON responses
    if (res.get('Content-Type')?.includes('application/json')) {
      try {
        const parsedData = JSON.parse(data);
        
        // If response doesn't have success field, add it
        if (typeof parsedData === 'object' && !parsedData.hasOwnProperty('success')) {
          const standardizedData = {
            success: res.statusCode >= 200 && res.statusCode < 300,
            data: parsedData,
            timestamp: new Date().toISOString(),
            path: req.originalUrl,
            method: req.method
          };
          
          return originalSend.call(this, JSON.stringify(standardizedData));
        }
      } catch (e) {
        // If parsing fails, send original data
      }
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

export { ERROR_TYPES, ERROR_CODES };