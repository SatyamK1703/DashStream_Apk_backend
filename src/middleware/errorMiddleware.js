/**
 * Custom error handling middleware
 * Enhanced for React Native app
 */

import logger from "../utils/logger.js";
// Import custom AppError class
import { AppError } from "../utils/appError.js";

// Error handler for development environment
const sendErrorDev = (err, res, logger) => {
  // Log error with full details in development
  logger.error("Error occurred", {
    error: err.message,
    stack: err.stack,
    statusCode: err.statusCode,
    errorCode: err.errorCode,
    isOperational: err.isOperational,
  });

  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    errorCode: err.errorCode || "APP-000-000",
    userFriendlyMessage: err.userFriendlyMessage || err.message,
    stack: err.stack,
  });
};

// Error handler for production environment
const sendErrorProd = (err, res, logger) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    // Log operational errors as warnings
    logger.warn("Operational error", {
      error: err.message,
      statusCode: err.statusCode,
      errorCode: err.errorCode,
      userFriendlyMessage: err.userFriendlyMessage,
    });

    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      errorCode: err.errorCode || `APP-${err.statusCode || 500}-000`,
      userFriendlyMessage: err.userFriendlyMessage || err.message,
    });
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error("Unexpected error", {
      error: err.message,
      stack: err.stack,
      statusCode: err.statusCode,
      name: err.name,
      code: err.code,
    });

    res.status(500).json({
      status: "error",
      message: "Something went wrong",
      errorCode: "APP-500-000",
      userFriendlyMessage: "Something went wrong. Please try again later.",
    });
  }
};

// Handle MongoDB duplicate key errors
const handleDuplicateFieldsDB = (err) => {
  let value = "";
  if (err.keyValue) {
    value = JSON.stringify(err.keyValue);
  } else if (err.errmsg) {
    const match = err.errmsg.match(/(["'])(\\?.)*?\1/);
    value = match ? match[0] : "";
  }
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

// Handle MongoDB validation errors
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors || {}).map((el) => el.message);
  const message = `Invalid input data. ${errors.join(". ")}`;
  return new AppError(message, 400);
};

// Handle JWT errors
const handleJWTError = () =>
  new AppError("Invalid token. Please log in again!", 401);
const handleJWTExpiredError = () =>
  new AppError("Your token has expired! Please log in again.", 401);

// Main error handling middleware
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  // Use request logger if available, fallback to global logger
  const requestLogger = req.logger || logger;

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, res, requestLogger);
  } else if (process.env.NODE_ENV === "production") {
    let error = Object.create(err); // preserve prototype chain
    error.message = err.message;
    error.name = err.name;
    error.code = err.code;
    error.errors = err.errors;
    error.keyValue = err.keyValue;

    // Handle specific error types
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === "ValidationError")
      error = handleValidationErrorDB(error);
    if (error.name === "JsonWebTokenError") error = handleJWTError();
    if (error.name === "TokenExpiredError") error = handleJWTExpiredError();

    sendErrorProd(error, res, requestLogger);
  }
};

// Async handler to avoid try-catch blocks in controllers
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export { errorHandler, asyncHandler, AppError };
