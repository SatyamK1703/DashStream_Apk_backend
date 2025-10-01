/**
 * Validation middleware
 * Provides request validation for the React Native app
 */
import { AppError } from "../utils/appError.js";

/**
 * Validate request body against a schema
 * @param {Object} schema - Joi schema for validation
 * @returns {Function} Express middleware function
 */
export const validateBody = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      const message = error.details.map((detail) => detail.message).join(", ");
      return next(new AppError(message, 400));
    }
    req.body = value;
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
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      const message = error.details.map((detail) => detail.message).join(", ");
      return next(new AppError(message, 400));
    }
    req.query = value;
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
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      const message = error.details.map((detail) => detail.message).join(", ");
      return next(new AppError(message, 400));
    }
    req.params = value;
    next();
  };
};

/**
 * Validate MongoDB ObjectId
 * @returns {Function} Express middleware function
 */
import mongoose from "mongoose";

export const validateObjectId = (paramName = "id") => {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError(`Invalid ${paramName} format`, 400));
    }
    next();
  };
};
