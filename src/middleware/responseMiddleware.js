/**
 * Response formatting middleware
 * Ensures consistent API responses for the React Native app
 */
import { formatSuccess, formatPaginated } from '../utils/responseFormatter.js';

/**
 * Middleware to enhance Express response object with custom methods
 * for standardized API responses
 */
export const responseEnhancer = (req, res, next) => {
  // Add success response method 
  res.sendSuccess = function(data, message, statusCode = 200) {
    return this.status(statusCode).json(formatSuccess(data, message, statusCode));
  };

  // Add paginated response method
  res.sendPaginated = function(data, page, limit, totalCount, message) {
    return this.status(200).json(formatPaginated(data, page, limit, totalCount, message));
  };

  // Add not found response method
  res.sendNotFound = function(message = 'Resource not found') {
    return this.status(404).json({
      status: 'fail',
      statusCode: 404,
      message,
      errorCode: 'APP-404-001',
      userFriendlyMessage: message
    });
  };

  // Add bad request response method
  res.sendBadRequest = function(message = 'Bad request') {
    return this.status(400).json({
      status: 'fail',
      statusCode: 400,
      message,
      errorCode: 'APP-400-001',
      userFriendlyMessage: message
    });
  };

  // Add unauthorized response method
  res.sendUnauthorized = function(message = 'Unauthorized access') {
    return this.status(401).json({
      status: 'fail',
      statusCode: 401,
      message,
      errorCode: 'APP-401-001',
      userFriendlyMessage: message
    });
  };

  // Add forbidden response method
  res.sendForbidden = function(message = 'Access forbidden') {
    return this.status(403).json({
      status: 'fail',
      statusCode: 403,
      message,
      errorCode: 'APP-403-001',
      userFriendlyMessage: message
    });
  };

  // Add generic error response method
  res.sendError = function(message = 'An error occurred', statusCode = 500, errorCode = null) {
    const code = errorCode || `APP-${statusCode}-${Math.floor(Math.random() * 900) + 100}`;
    return this.status(statusCode).json({
      status: statusCode >= 400 && statusCode < 500 ? 'fail' : 'error',
      statusCode,
      message,
      errorCode: code,
      userFriendlyMessage: message
    });
  };

  next();
};