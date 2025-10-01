import crypto from "crypto";
import logger, { createRequestLogger } from "../utils/logger.js";

export const requestIdMiddleware = (req, res, next) => {
  // Honor inbound request id if provided
  const incomingId = req.headers["x-request-id"] || req.headers["x-requestid"];
  req.id =
    typeof incomingId === "string" && incomingId.trim()
      ? incomingId.trim()
      : crypto.randomUUID();

  // Set response header
  res.setHeader("X-Request-ID", req.id);

  // Create a child logger with request context
  req.logger = createRequestLogger(req.id, {
    method: req.method,
    path: req.path,
    userAgent: req.get("User-Agent"),
    ip: req.ip || req.connection?.remoteAddress,
  });

  // Log incoming request
  req.logger.info(`Incoming ${req.method} request`, {
    url: req.originalUrl,
    query: req.query,
    body: req.method !== "GET" ? req.body || {} : undefined,
    headers: {
      "content-type": req.get("Content-Type"),
      authorization: req.get("Authorization") ? "[REDACTED]" : undefined,
      "x-client-version": req.get("X-Client-Version"),
      "x-platform": req.get("X-Platform"),
    },
  });

  // Log response on finish
  const originalSend = res.send;
  res.send = function (body) {
    req.logger.info(`Outgoing response`, {
      statusCode: res.statusCode,
      contentLength: res.get("Content-Length") || (body ? body.length : 0),
      duration: Date.now() - req.startTime,
    });
    return originalSend.call(this, body);
  };

  // Track request start time for duration calculation
  req.startTime = Date.now();

  next();
};

export default requestIdMiddleware;
