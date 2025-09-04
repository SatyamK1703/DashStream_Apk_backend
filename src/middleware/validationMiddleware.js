/**
 * Validation middleware
 * Provides request validation for the React Native app
 */
import AppError from '../utils/appError.js';

/**
 * Validate request body against a schema
 * @param {Object} schema - Joi schema for validation
 * @returns {Function} Express middleware function
 */
export const validateBody = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      const message = error.details.map(detail => detail.message).join(', ');
      return next(new AppError(message, 400));
    }
    next();
  };
};

/**
 * Validate request query parameters against a schema
 * @param {Object} schema - Joi schema for validation
 * @returns {Function} Express middleware function
 */
export const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.query);
    if (error) {
      const message = error.details.map(detail => detail.message).join(', ');
      return next(new AppError(message, 400));
    }
    next();
  };
};

/**
 * Validate request parameters against a schema
 * @param {Object} schema - Joi schema for validation
 * @returns {Function} Express middleware function
 */
export const validateParams = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.params);
    if (error) {
      const message = error.details.map(detail => detail.message).join(', ');
      return next(new AppError(message, 400));
    }
    next();
  };
};

/**
 * Validate MongoDB ObjectId
 * @returns {Function} Express middleware function
 */
export const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return next(new AppError(`Invalid ${paramName} format`, 400));
    }
    next();
  };
};