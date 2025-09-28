/**
 * Network error handling utility
 * Provides consistent handling of network errors for the React Native app
 */
import { AppError } from "./appError.js";

/**
 * Network error codes and messages
 */
export const NetworkErrorCodes = {
  TIMEOUT: "NETWORK_TIMEOUT",
  CONNECTION_ERROR: "CONNECTION_ERROR",
  SERVER_ERROR: "SERVER_ERROR",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
};

/**
 * Handle network timeout
 * @param {Number} timeout - Timeout in milliseconds (default: 30000)
 * @returns {Promise} Promise that rejects after timeout
 */
export const handleTimeout = (timeout = 30000) => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(
        new AppError(
          "Request timed out. Please check your internet connection.",
          408
        )
      );
    }, timeout);
  });
};

/**
 * Handle network errors
 * @param {Error} error - The error object
 * @returns {AppError} Formatted AppError
 */
export const handleNetworkError = (error) => {
  // Check if it's a timeout error
  if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
    return new AppError(
      "Request timed out. Please check your internet connection.",
      408
    );
  }

  // Check if it's a connection error
  if (
    error.code === "ECONNREFUSED" ||
    error.message.includes("Network Error")
  ) {
    return new AppError(
      "Unable to connect to the server. Please check your internet connection.",
      503
    );
  }

  // Server error
  if (error.response && error.response.status >= 500) {
    return new AppError(
      "Server error. Please try again later.",
      error.response.status
    );
  }

  // Default error
  return new AppError("An unexpected error occurred. Please try again.", 500);
};

/**
 * Create a promise race between the actual request and a timeout
 * @param {Promise} requestPromise - The actual request promise
 * @param {Number} timeout - Timeout in milliseconds
 * @returns {Promise} Promise that resolves with the request result or rejects with timeout
 */
export const withTimeout = (requestPromise, timeout = 30000) => {
  return Promise.race([requestPromise, handleTimeout(timeout)]);
};
