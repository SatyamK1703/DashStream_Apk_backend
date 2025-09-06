/**
 * Location Service Error Handler
 * Provides standardized error handling for location services
 */
import AppError from './appError.js';

/**
 * Error codes for location service
 */
export const ErrorCodes = {
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  ROLE_INVALID: 'ROLE_INVALID',
  LOCATION_NOT_INITIALIZED: 'LOCATION_NOT_INITIALIZED',
  LOCATION_NOT_FOUND: 'LOCATION_NOT_FOUND',
  INVALID_STATUS: 'INVALID_STATUS',
  INVALID_COORDINATES: 'INVALID_COORDINATES',
  FIREBASE_ERROR: 'FIREBASE_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

/**
 * Handle location service errors
 * @param {Error} error - The error object
 * @param {string} operation - The operation being performed
 * @returns {AppError} Standardized AppError object
 */
export const handleLocationError = (error, operation) => {
  console.error(`Error in location service (${operation}):`, error);
  
  // Extract error message and code
  const message = error.message || 'An unknown error occurred';
  let errorCode = ErrorCodes.UNKNOWN_ERROR;
  let statusCode = 500;
  
  // Determine error type and set appropriate code and status
  if (message.includes('User not found')) {
    errorCode = ErrorCodes.USER_NOT_FOUND;
    statusCode = 404;
  } else if (message.includes('Only professionals')) {
    errorCode = ErrorCodes.ROLE_INVALID;
    statusCode = 403;
  } else if (message.includes('Location tracking not initialized')) {
    errorCode = ErrorCodes.LOCATION_NOT_INITIALIZED;
    statusCode = 404;
  } else if (message.includes('Location not found')) {
    errorCode = ErrorCodes.LOCATION_NOT_FOUND;
    statusCode = 404;
  } else if (message.includes('Invalid status')) {
    errorCode = ErrorCodes.INVALID_STATUS;
    statusCode = 400;
  } else if (message.includes('Invalid coordinates')) {
    errorCode = ErrorCodes.INVALID_COORDINATES;
    statusCode = 400;
  } else if (message.includes('Firebase') || message.includes('firestore')) {
    errorCode = ErrorCodes.FIREBASE_ERROR;
    statusCode = 500;
  } else if (error.name === 'ValidationError' || message.includes('validation failed')) {
    errorCode = ErrorCodes.VALIDATION_ERROR;
    statusCode = 400;
  } else if (error.name === 'MongoError' || error.name === 'MongooseError') {
    errorCode = ErrorCodes.DATABASE_ERROR;
    statusCode = 500;
  } else if (message.includes('network') || message.includes('connection')) {
    errorCode = ErrorCodes.NETWORK_ERROR;
    statusCode = 503;
  } else if (message.includes('permission') || message.includes('not authorized')) {
    errorCode = ErrorCodes.PERMISSION_DENIED;
    statusCode = 403;
  }
  
  // Create standardized error response
  return new AppError(message, statusCode, errorCode);
};

/**
 * Wrap a location service function with error handling
 * @param {Function} fn - The function to wrap
 * @param {string} operation - Name of the operation for logging
 * @returns {Function} Wrapped function with error handling
 */
export const withErrorHandling = (fn, operation) => {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      throw handleLocationError(error, operation);
    }
  };
};

/**
 * Validate coordinates
 * @param {Object} coordinates - The coordinates object
 * @param {number} coordinates.latitude - Latitude
 * @param {number} coordinates.longitude - Longitude
 * @throws {AppError} If coordinates are invalid
 */
export const validateCoordinates = (coordinates) => {
  if (!coordinates || 
      typeof coordinates.latitude !== 'number' || 
      typeof coordinates.longitude !== 'number' ||
      coordinates.latitude < -90 || 
      coordinates.latitude > 90 ||
      coordinates.longitude < -180 || 
      coordinates.longitude > 180) {
    throw new AppError(
      'Invalid coordinates provided. Latitude must be between -90 and 90, longitude between -180 and 180.',
      400,
      ErrorCodes.INVALID_COORDINATES
    );
  }
};

/**
 * Validate professional status
 * @param {string} status - The status to validate
 * @throws {AppError} If status is invalid
 */
export const validateStatus = (status) => {
  const validStatuses = ['available', 'busy', 'offline'];
  if (!validStatuses.includes(status)) {
    throw new AppError(
      `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      400,
      ErrorCodes.INVALID_STATUS
    );
  }
};