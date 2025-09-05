import express from 'express';

/**
 * Middleware to capture raw body for webhook signature verification
 * This is necessary because we need the raw body to verify the webhook signature
 * but express.json() middleware parses the body and makes it unavailable
 */
export const rawBodyMiddleware = (req, res, next) => {
  if (req.originalUrl === '/api/payments/webhook') {
    // For webhook endpoint, use raw body parser
    express.raw({ type: 'application/json' })(req, res, next);
  } else {
    // For all other endpoints, use JSON parser
    express.json()(req, res, next);
  }
};

/**
 * Middleware to save raw body for webhook verification
 */
export const saveRawBody = (req, res, next) => {
  if (req.originalUrl === '/api/payments/webhook' && req.body) {
    // Save raw body for webhook signature verification
    req.rawBody = req.body.toString();
    // Parse the raw body for further processing
    try {
      req.body = JSON.parse(req.rawBody);
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid JSON payload'
      });
    }
  }
  next();
};