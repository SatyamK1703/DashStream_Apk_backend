/**
 * Response formatter utility for consistent API responses
 * Designed for React Native app consumption
 */

/**
 * Format success response
 * @param {Object} data - The data to send in the response
 * @param {String} message - Success message
 * @param {Number} statusCode - HTTP status code (default: 200)
 * @returns {Object} Formatted response object
 */
export const formatSuccess = (data, message = 'Success', statusCode = 200) => {
  return {
    status: 'success',
    statusCode,
    message,
    data
  };
};

/**
 * Format error response
 * @param {String} message - Error message
 * @param {Number} statusCode - HTTP status code (default: 500)
 * @param {String} errorCode - Unique error code
 * @param {String} userFriendlyMessage - User-friendly error message
 * @returns {Object} Formatted error response object
 */
export const formatError = (
  message = 'Something went wrong',
  statusCode = 500,
  errorCode = 'APP-500-000',
  userFriendlyMessage = 'Something went wrong. Please try again later.'
) => {
  return {
    status: statusCode >= 400 && statusCode < 500 ? 'fail' : 'error',
    statusCode,
    message,
    errorCode,
    userFriendlyMessage
  };
};

/**
 * Format paginated response
 * @param {Array} data - The data array to send in the response
 * @param {Number} page - Current page number
 * @param {Number} limit - Items per page
 * @param {Number} totalCount - Total number of items
 * @param {String} message - Success message
 * @returns {Object} Formatted paginated response object
 */
export const formatPaginated = (data, page, limit, totalCount, message = 'Success') => {
  return {
    status: 'success',
    message,
    results: data.length,
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / limit),
    data
  };
};