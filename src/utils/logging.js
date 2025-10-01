/**
 * Logging utilities for consistent log formatting across the application
 */

import logger, { createRequestLogger } from "./logger.js";

/**
 * Log structured data with consistent formatting
 */
export const logWithContext = (
  level,
  message,
  context = {},
  requestLogger = null
) => {
  const loggerInstance = requestLogger || logger;
  loggerInstance[level](message, {
    ...context,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Database operation logging
 */
export const logDatabaseOperation = (
  operation,
  collection,
  data = {},
  requestLogger = null
) => {
  logWithContext(
    "debug",
    `Database ${operation}`,
    {
      operation,
      collection,
      data: typeof data === "object" ? JSON.stringify(data) : data,
    },
    requestLogger
  );
};

/**
 * Authentication logging
 */
export const logAuthEvent = (
  event,
  userId = null,
  details = {},
  requestLogger = null
) => {
  logWithContext(
    "info",
    `Auth event: ${event}`,
    {
      event,
      userId,
      ...details,
    },
    requestLogger
  );
};

/**
 * Payment processing logging
 */
export const logPaymentEvent = (
  event,
  paymentId,
  amount = null,
  details = {},
  requestLogger = null
) => {
  logWithContext(
    "info",
    `Payment event: ${event}`,
    {
      event,
      paymentId,
      amount,
      ...details,
    },
    requestLogger
  );
};

/**
 * External API call logging
 */
export const logExternalApiCall = (
  service,
  endpoint,
  method = "GET",
  duration = null,
  statusCode = null,
  requestLogger = null
) => {
  logWithContext(
    "info",
    `External API call: ${service}`,
    {
      service,
      endpoint,
      method,
      duration: duration ? `${duration}ms` : null,
      statusCode,
    },
    requestLogger
  );
};

/**
 * Business logic logging
 */
export const logBusinessEvent = (
  event,
  entityType,
  entityId,
  details = {},
  requestLogger = null
) => {
  logWithContext(
    "info",
    `Business event: ${event}`,
    {
      event,
      entityType,
      entityId,
      ...details,
    },
    requestLogger
  );
};

/**
 * Performance logging
 */
export const logPerformance = (
  operation,
  duration,
  details = {},
  requestLogger = null
) => {
  const level = duration > 5000 ? "warn" : duration > 1000 ? "info" : "debug";
  logWithContext(
    level,
    `Performance: ${operation}`,
    {
      operation,
      duration: `${duration}ms`,
      ...details,
    },
    requestLogger
  );
};

/**
 * Security event logging
 */
export const logSecurityEvent = (
  event,
  severity = "info",
  details = {},
  requestLogger = null
) => {
  const logLevel =
    severity === "critical" ? "error" : severity === "high" ? "warn" : "info";
  logWithContext(
    logLevel,
    `Security event: ${event}`,
    {
      event,
      severity,
      ...details,
    },
    requestLogger
  );
};

/**
 * Validation error logging
 */
export const logValidationError = (
  field,
  value,
  error,
  requestLogger = null
) => {
  logWithContext(
    "warn",
    `Validation error`,
    {
      field,
      value: typeof value === "string" ? value.substring(0, 100) : value, // Limit log size
      error,
    },
    requestLogger
  );
};

/**
 * Rate limiting logging
 */
export const logRateLimit = (
  identifier,
  limit,
  current,
  requestLogger = null
) => {
  logWithContext(
    "warn",
    `Rate limit triggered`,
    {
      identifier,
      limit,
      current,
      percentage: Math.round((current / limit) * 100),
    },
    requestLogger
  );
};

export default {
  logWithContext,
  logDatabaseOperation,
  logAuthEvent,
  logPaymentEvent,
  logExternalApiCall,
  logBusinessEvent,
  logPerformance,
  logSecurityEvent,
  logValidationError,
  logRateLimit,
};
