/**
 * API Response Utility
 * Provides standardized response format for all API API_ENDPOINTS
 */

/**
 * Standard response status types
 */
export const ResponseStatus = {
  SUCCESS: "success",
  ERROR: "error",
  FAIL: "fail",
};

/**
 * Create a standardized success response
 * @param {Object} options - Response options
 * @param {any} options.data - Response data
 * @param {string} options.message - Success message
 * @param {number} options.statusCode - HTTP status code (default: 200)
 * @param {Object} options.meta - Additional metadata
 * @returns {Object} Formatted success response
 */
export const successResponse = ({
  data = null,
  message = "Operation successful",
  statusCode = 200,
  meta = {},
} = {}) => {
  return {
    status: ResponseStatus.SUCCESS,
    statusCode,
    message,
    data,
    meta,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Create a standardized error response
 * @param {Object} options - Response options
 * @param {string} options.message - Error message
 * @param {number} options.statusCode - HTTP status code (default: 500)
 * @param {string} options.errorCode - Error code for client reference
 * @param {Object} options.errors - Detailed error information
 * @param {Object} options.meta - Additional metadata
 * @returns {Object} Formatted error response
 */
export const errorResponse = ({
  message = "An error occurred",
  statusCode = 500,
  errorCode = null,
  errors = null,
  meta = {},
} = {}) => {
  return {
    status: ResponseStatus.ERROR,
    statusCode,
    message,
    errorCode,
    errors,
    meta,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Create a standardized validation failure response
 * @param {Object} options - Response options
 * @param {string} options.message - Failure message
 * @param {Object} options.errors - Validation errors
 * @param {number} options.statusCode - HTTP status code (default: 400)
 * @param {Object} options.meta - Additional metadata
 * @returns {Object} Formatted validation failure response
 */
export const validationFailResponse = ({
  message = "Validation failed",
  errors = {},
  statusCode = 400,
  meta = {},
} = {}) => {
  return {
    status: ResponseStatus.FAIL,
    statusCode,
    message,
    errors,
    meta,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Express middleware to add response helpers to res object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const apiResponseMiddleware = (req, res, next) => {
  // Add success response method
  res.success = function (options = {}) {
    const response = successResponse(options);
    return this.status(options.statusCode || 200).json(response);
  };

  // Add error response method
  res.error = function (options = {}) {
    const response = errorResponse(options);
    return this.status(options.statusCode || 500).json(response);
  };

  // Add validation failure response method
  res.validationFail = function (options = {}) {
    const response = validationFailResponse(options);
    return this.status(options.statusCode || 400).json(response);
  };

  // Add not found response method
  res.notFound = function (message = "Resource not found") {
    const response = errorResponse({
      message,
      statusCode: 404,
      errorCode: "RESOURCE_NOT_FOUND",
    });
    return this.status(404).json(response);
  };

  // Backwards-compatible aliases used in older controllers
  // Keep the newer method names (success/error/validationFail/notFound)
  // but expose the legacy names so existing code doesn't break.
  res.sendSuccess = function (
    data = null,
    message = "Operation successful",
    statusCode = 200,
    meta = {}
  ) {
    return res.success({ data, message, statusCode, meta });
  };

  res.sendError = function (
    message = "An error occurred",
    statusCode = 500,
    errorCode = null,
    errors = null,
    meta = {}
  ) {
    return res.error({ message, statusCode, errorCode, errors, meta });
  };

  res.sendValidationFail = function (
    message = "Validation failed",
    errors = {},
    statusCode = 400,
    meta = {}
  ) {
    return res.validationFail({ message, errors, statusCode, meta });
  };

  res.sendNotFound = function (message = "Resource not found") {
    return res.notFound(message);
  };

  next();
};

/**
 * Express error handler middleware for standardized error responses
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const errorHandlerMiddleware = (err, req, res, next) => {
  console.error("API Error:", err);

  // Default error response
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";
  let errorCode = err.errorCode || "INTERNAL_SERVER_ERROR";
  let errors = err.errors || null;

  // Handle validation errors (e.g., from express-validator)
  if (err.name === "ValidationError" || (Array.isArray(err) && err[0]?.param)) {
    statusCode = 400;
    message = "Validation failed";
    errorCode = "VALIDATION_ERROR";

    // Format validation errors
    errors = Array.isArray(err)
      ? err.reduce((acc, curr) => {
          acc[curr.param] = curr.msg;
          return acc;
        }, {})
      : err.errors;
  }

  // Handle MongoDB errors
  if (err.name === "MongoError" || err.name === "MongoServerError") {
    if (err.code === 11000) {
      // Duplicate key error
      statusCode = 409;
      message = "Duplicate entry";
      errorCode = "DUPLICATE_ENTRY";
    }
  }

  // Send standardized error response
  res.status(statusCode).json({
    status: ResponseStatus.ERROR,
    statusCode,
    message,
    errorCode,
    errors,
    timestamp: new Date().toISOString(),
  });
};

export default {
  successResponse,
  errorResponse,
  validationFailResponse,
  apiResponseMiddleware,
  errorHandlerMiddleware,
  ResponseStatus,
};
