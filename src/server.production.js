/**
 * Production-Ready Server Configuration for DashStream
 * Optimized for mobile app backend with proper security and monitoring
 */
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import session from "express-session";
import MongoStore from "connect-mongo";
import dotenv from "dotenv";
import path from "path";

// Import production configurations
import {
  validateProductionEnv,
  productionRateLimiting,
  productionSecurityConfig,
  productionCorsConfig,
  productionDbConfig,
  productionLoggingConfig,
  productionSessionConfig,
  productionOptimizations,
} from "./config/production.js";

// Import routes
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import offerRoutes from "./routes/offerRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import locationRoutes from "./routes/locationRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import membershipRoutes from "./routes/membershipRoutes.js";
import professionalRoutes from "./routes/professionalRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import vehicleRoutes from "./routes/vehicleRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";

// Import middleware
import { errorHandler } from "./middleware/errorMiddleware.js";
import {
  rawBodyMiddleware,
  saveRawBody,
} from "./middleware/webhookMiddleware.js";
import {
  apiResponseMiddleware,
  errorHandlerMiddleware,
} from "./utils/apiResponse.js";

// Load environment variables - Production configuration
if (process.env.NODE_ENV === "production") {
  dotenv.config({ path: ".env.production" });
  console.log("📄 Loaded .env.production configuration");
} else {
  dotenv.config({ path: ".env.production" }); // Default to production for this server file
  console.log("📄 Loaded .env.production configuration (fallback)");
}

// Validate production environment
console.log("🚀 Starting DashStream Production Server...");
validateProductionEnv();

// Create Express app
const app = express();

// Trust proxy for production deployment (Vercel, Heroku, etc.)
app.set("trust proxy", 1);

// Security middleware - MUST be first
app.use(helmet(productionSecurityConfig));

// Compression for better performance
app.use(compression(productionOptimizations.compression));

// Enhanced logging for production
if (process.env.NODE_ENV === "production") {
  app.use(morgan("combined", productionLoggingConfig));
} else {
  app.use(morgan("dev"));
}

// Rate limiting - Apply before CORS and body parsing
app.use("/api/auth/send-otp", productionRateLimiting.otp);
app.use("/api/auth/verify-otp", productionRateLimiting.otp);
app.use("/api/auth/", productionRateLimiting.auth);
app.use("/api/", productionRateLimiting.slowDown);
app.use("/api/", productionRateLimiting.general);

// CORS configuration for mobile app support
app.use(cors(productionCorsConfig));
app.options("*", cors(productionCorsConfig)); // Handle preflight

// Body parser with webhook support
app.use(rawBodyMiddleware);
app.use(saveRawBody);
app.use(express.json(productionOptimizations.json));
app.use(express.urlencoded(productionOptimizations.urlencoded));

// API Response middleware
app.use(apiResponseMiddleware);

// Production session configuration
if (process.env.NODE_ENV === "production") {
  app.use(
    session({
      ...productionSessionConfig,
      store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        ttl: 24 * 60 * 60, // 1 day TTL
        touchAfter: 24 * 3600, // Update once per day unless data changes
        crypto: {
          secret: process.env.SESSION_SECRET || "fallback-session-secret",
        },
      }),
    })
  );
}

// Health check endpoints
app.get("/health", (req, res) => {
  const healthStatus = {
    status: "healthy",
    service: "DashStream API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    uptime: Math.floor(process.uptime()),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + " MB",
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + " MB",
    },
  };

  // Add database status in production
  if (mongoose.connection.readyState === 1) {
    healthStatus.database = "connected";
  } else {
    healthStatus.database = "disconnected";
    healthStatus.status = "degraded";
  }

  const statusCode = healthStatus.status === "healthy" ? 200 : 503;
  res.status(statusCode).json(healthStatus);
});

// Detailed health check for monitoring
app.get("/api/health", async (req, res) => {
  const checks = {
    timestamp: new Date().toISOString(),
    service: "DashStream API",
    version: "1.0.0",
    environment: process.env.NODE_ENV,
    status: "healthy",
    checks: {
      memory: {
        status: "healthy",
        usage: process.memoryUsage(),
      },
      uptime: Math.floor(process.uptime()),
    },
  };

  // Enhanced database health check
  try {
    const dbHealth = await DatabaseHealthCheck.check();
    checks.checks.database = dbHealth;

    if (dbHealth.status === "unhealthy") {
      checks.status = "unhealthy";
    }
  } catch (error) {
    checks.checks.database = {
      status: "unhealthy",
      error: error.message,
    };
    checks.status = "unhealthy";
  }

  const statusCode = checks.status === "healthy" ? 200 : 503;
  res.status(statusCode).json(checks);
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/membership", membershipRoutes);
app.use("/api/professional", professionalRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/upload", uploadRoutes);

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  const __dirname = path.resolve();
  app.use(express.static(path.join(__dirname, "public")));

  app.get("/", (req, res) => {
    res.status(200).json({
      message: "DashStream API is running in production mode",
      version: "1.0.0",
      documentation: "/api/health",
      status: "operational",
    });
  });
}

// 404 handler
app.all("*", (req, res) => {
  res.status(404).json({
    status: "error",
    message: `Can't find ${req.originalUrl} on this server`,
    statusCode: 404,
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware (MUST be last)
app.use(errorHandlerMiddleware);
app.use(errorHandler);

// Import optimized database configuration
import { DatabaseConnection, DatabaseHealthCheck } from "./config/database.js";

// Database connection with production optimizations
const connectDB = async () => {
  try {
    await DatabaseConnection.connect(
      process.env.MONGODB_URI,
      productionDbConfig.mongoose
    );
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    // Don't exit in production, let process manager handle restarts
    if (process.env.NODE_ENV !== "production") {
      process.exit(1);
    }
  }
};

// Start server
const startServer = () => {
  const PORT = process.env.PORT || 5000;
  const HOST = process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost";

  const server = app.listen(PORT, HOST, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV} mode`);
    console.log(`🌐 Server URL: http://${HOST}:${PORT}`);
    console.log(`📱 Health Check: http://${HOST}:${PORT}/health`);
    console.log(`🔒 Security: Production grade`);
    console.log(`⚡ Performance: Optimized`);
  });

  // Graceful shutdown handling
  const gracefulShutdown = (signal) => {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

    server.close((err) => {
      if (err) {
        console.error("❌ Error during server shutdown:", err);
        process.exit(1);
      }

      console.log("✅ Server closed");

      // Close database connection
      mongoose.connection.close(false, () => {
        console.log("✅ Database connection closed");
        process.exit(0);
      });
    });

    // Force close after 30 seconds
    setTimeout(() => {
      console.error("⚠️ Forcing shutdown after 30 seconds...");
      process.exit(1);
    }, 30000);
  };

  // Handle process signals
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  // Handle unhandled rejections
  process.on("unhandledRejection", (err) => {
    console.error("💥 UNHANDLED REJECTION! Shutting down...");
    console.error("Error:", err);
    gracefulShutdown("unhandledRejection");
  });

  // Handle uncaught exceptions
  process.on("uncaughtException", (err) => {
    console.error("💥 UNCAUGHT EXCEPTION! Shutting down...");
    console.error("Error:", err);
    process.exit(1);
  });

  return server;
};

// Initialize application
const init = async () => {
  await connectDB();
  startServer();
};

// Start the application
init().catch((error) => {
  console.error("💥 Failed to start server:", error);
  process.exit(1);
});

export default app;
