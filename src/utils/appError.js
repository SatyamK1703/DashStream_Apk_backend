/**
 * Custom error class for API errors
 * Provides consistent error formatting for the React Native app
 */
class AppError extends Error {
  constructor(message, statusCode, errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;

    // Add additional properties for React Native app
    this.errorCode = errorCode || this.generateErrorCode(statusCode, message);
    this.userFriendlyMessage = this.getUserFriendlyMessage(statusCode, message);

    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Generate a unique error code based on status code and message
   * Format: APP-{statusCode}-{hash}
   */
  generateErrorCode(statusCode, message) {
    // Simple hash function for message
    const hash = Math.abs(
      message.split("").reduce((acc, char) => {
        return acc + char.charCodeAt(0);
      }, 0) % 1000
    )
      .toString()
      .padStart(3, "0");

    return `APP-${statusCode}-${hash}`;
  }

  /**
   * Get user-friendly error message based on status code
   */
  getUserFriendlyMessage(statusCode, message) {
    // For 4xx errors, we can usually show the actual message
    if (statusCode >= 400 && statusCode < 500) {
      return message;
    }

    // For 5xx errors, provide a generic message
    return "Something went wrong. Please try again later.";
  }
}

export { AppError };
