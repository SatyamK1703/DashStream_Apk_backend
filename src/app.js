
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import session from "express-session";
import MongoStore from "connect-mongo";
import dotenv from "dotenv";
import path from "path";

// Import configurations
import {
  validateProductionEnv,
  productionRateLimiting,
  productionSecurityConfig,
  productionCorsConfig,
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
} from "./utils/apiResponse.js";
import passport from "./utils/passport.js";

// Load environment variables
dotenv.config();

const app = express();

// Production specific configurations
if (process.env.NODE_ENV === "production") {
  validateProductionEnv();
  app.set("trust proxy", 1);
  app.use(helmet(productionSecurityConfig));
  app.use(morgan("combined"));
  app.use("/api/auth/send-otp", productionRateLimiting.otp);
  app.use("/api/auth/verify-otp", productionRateLimiting.otp);
  app.use("/api/auth/", productionRateLimiting.auth);
  app.use("/api/", productionRateLimiting.slowDown);
  app.use("/api/", productionRateLimiting.general);
  app.use(cors(productionCorsConfig));
  app.options("*", cors(productionCorsConfig));
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
} else {
  // Development specific configurations
  app.use(morgan("dev"));
  const corsOptions = {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-Client-Version",
      "X-Platform",
      "X-Request-Time",
      "X-API-Key",
      "X-Device-ID",
      "X-App-Version",
    ],
    exposedHeaders: ["X-Total-Count", "X-Page-Count", "X-Current-Page"],
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 200,
  };
  app.use(cors(corsOptions));
  app.options("*", cors());
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "super-secret-key",
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        ttl: parseInt(process.env.SESSION_EXPIRY) / 1000 || 14 * 24 * 60 * 60,
        touchAfter: 24 * 3600,
      }),
      cookie: {
        secure: false,
        httpOnly: true,
        maxAge: parseInt(process.env.SESSION_EXPIRY) || 14 * 24 * 60 * 60 * 1000,
        sameSite: "lax",
      },
    })
  );
}

// Common configurations
app.set("etag", "strong");
app.use(compression(productionOptimizations.compression));
app.use(rawBodyMiddleware);
app.use(saveRawBody);
app.use(express.json(productionOptimizations.json));
app.use(express.urlencoded(productionOptimizations.urlencoded));
app.use(apiResponseMiddleware);
app.use(passport.initialize());
app.use(passport.session());

// API Routes
app.use("/api/admins", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/memberships", membershipRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/professionals", professionalRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/users", userRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/upload", uploadRoutes);

// Health check route
app.get("/api/health", (req, res) => {
  res.sendSuccess(
    {
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
    },
    "Server is running"
  );
});

// Serve static assets in production
if (process.env.NODE_ENV === "production") {
  const __dirname = path.resolve();
  app.use(express.static(path.join(__dirname, "public")));

  app.get("/", (req, res) => {
    res.send("DashStream API is running");
  });
}

// 404 route handler
app.all("*", (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Can't find ${req.originalUrl} on this server!`,
    statusCode: 404,
  });
});

// Error handling middleware
app.use(errorHandler);

export default app;
