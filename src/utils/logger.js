import winston from "winston";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const { combine, timestamp, json, colorize, printf, splat, errors, metadata } =
  winston.format;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === "production";

// Check if we can create log directories (for serverless environments)
const canCreateLogDir = () => {
  try {
    const logDir = path.join(process.cwd(), "logs");
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    return true;
  } catch (error) {
    return false;
  }
};

const fileLogsEnabled = isProd && canCreateLogDir();

// Custom format that includes request ID in all log entries
const customFormat = printf(
  ({
    level,
    message,
    timestamp,
    requestId,
    stack,
    service = "dashstream-api",
    ...meta
  }) => {
    const reqIdStr = requestId ? ` [${requestId}]` : "";
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";

    if (stack) {
      return `${timestamp} [${service}]${reqIdStr} ${level}: ${message}${metaStr}\n${stack}`;
    }
    return `${timestamp} [${service}]${reqIdStr} ${level}: ${message}${metaStr}`;
  }
);

// Development format with colors
const developmentFormat = combine(
  colorize(),
  timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  errors({ stack: true }),
  splat(),
  customFormat
);

// Production format - JSON for structured logging
const productionFormat = combine(
  timestamp(),
  errors({ stack: true }),
  splat(),
  metadata({ fillExcept: ["message", "level", "timestamp", "label"] }),
  json()
);

// Create transports
const transports = [
  new winston.transports.Console({
    format: isProd ? productionFormat : developmentFormat,
  }),
];

// Add file transports for production (only if file system is writable)
if (fileLogsEnabled) {
  // Error log file
  transports.push(
    new winston.transports.File({
      filename: path.join(process.cwd(), "logs", "error.log"),
      level: "error",
      format: productionFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    })
  );

  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: path.join(process.cwd(), "logs", "combined.log"),
      format: productionFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
    })
  );

  // HTTP log file
  transports.push(
    new winston.transports.File({
      filename: path.join(process.cwd(), "logs", "http.log"),
      level: "http",
      format: productionFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: isProd ? "info" : "debug",
  levels: winston.config.npm.levels,
  format: isProd ? productionFormat : developmentFormat,
  defaultMeta: { service: "dashstream-api" },
  transports,
  exitOnError: false,
  handleExceptions: true,
  handleRejections: true,
});

// Log initialization info
if (isProd) {
  if (fileLogsEnabled) {
    logger.info("Logger initialized with file transports enabled");
  } else {
    logger.warn(
      "Logger initialized with console-only logging (file system not writable)"
    );
  }
} else {
  logger.info("Logger initialized in development mode");
}

// Create child logger with request context
logger.child = (meta = {}) => {
  return logger.child(meta);
};

// Export convenience methods
export const createRequestLogger = (requestId, additionalMeta = {}) => {
  return logger.child({
    requestId,
    ...additionalMeta,
  });
};

export const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
};

export default logger;
