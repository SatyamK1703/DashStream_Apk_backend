/**
 * Optimized Database Configuration for DashStream
 * Enhanced MongoDB connection with performance optimizations
 */
import mongoose from "mongoose";
import { createAllIndexes } from "./indexes.js";

/**
 * Optimized MongoDB Connection Configuration
 */
export const optimizedDbConfig = {
  // Connection Pool Settings
  maxPoolSize: process.env.NODE_ENV === "production" ? 10 : 5, // Maximum number of connections
  minPoolSize: 2, // Minimum number of connections
  connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  serverSelectionTimeoutMS: 5000, // How long to keep trying to select a server

  // Topology Settings
  heartbeatFrequencyMS: 10000, // Server discovery and monitoring heartbeat
  maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity

  // Connection Behavior
  family: 4, // Use IPv4, skip trying IPv6
  retryWrites: true,
  retryReads: true,

  // Read Preference for better performance
  readPreference: "primaryPreferred", // Read from primary, fallback to secondary
  readConcern: { level: "local" }, // Local read concern for better performance
  writeConcern: {
    w: "majority",
    j: true,
    wtimeout: 10000,
  },

  // Additional Performance Settings
  compressors: ["snappy", "zlib"], // Enable network compression
  zlibCompressionLevel: 6, // Compression level for zlib

  // Auto Index Creation
  autoIndex: process.env.NODE_ENV !== "production", // Disable in production
  autoCreate: process.env.NODE_ENV !== "production", // Disable in production
};

/**
 * Connection Pool Monitoring
 */
export class DatabaseMonitor {
  static startMonitoring() {
    const connection = mongoose.connection;

    // Connection Pool Events
    connection.on("connectionPoolCreated", (event) => {
      console.log("📊 Connection pool created:", event.address);
    });

    connection.on("connectionPoolClosed", (event) => {
      console.log("📊 Connection pool closed:", event.address);
    });

    connection.on("connectionCreated", (event) => {
      console.log(`📊 Connection created. Pool size: ${event.connectionId}`);
    });

    connection.on("connectionClosed", (event) => {
      console.log(`📊 Connection closed. Reason: ${event.reason}`);
    });

    // Performance Monitoring
    connection.on("commandStarted", (event) => {
      if (process.env.NODE_ENV === "development" && process.env.DEBUG_DB) {
        console.log(
          `🔍 DB Command: ${event.commandName} - Collection: ${
            event.command[event.commandName]
          }`
        );
      }
    });

    connection.on("commandSucceeded", (event) => {
      if (process.env.NODE_ENV === "development" && process.env.DEBUG_DB) {
        console.log(`✅ DB Command completed in ${event.duration}ms`);
      }
    });

    connection.on("commandFailed", (event) => {
      console.error(
        `❌ DB Command failed: ${event.commandName} - ${event.failure}`
      );
    });
  }

  /**
   * Get connection pool statistics
   */
  static getPoolStats() {
    const connection = mongoose.connection;
    if (connection.readyState === 1) {
      return {
        readyState: connection.readyState,
        host: connection.host,
        port: connection.port,
        name: connection.name,
        collections: Object.keys(connection.collections).length,
        models: Object.keys(connection.models).length,
      };
    }
    return null;
  }

  /**
   * Check connection health
   */
  static async checkConnectionHealth() {
    try {
      const start = Date.now();
      await mongoose.connection.db.admin().ping();
      const pingTime = Date.now() - start;

      return {
        status: "healthy",
        pingTime,
        readyState: mongoose.connection.readyState,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: "unhealthy",
        error: error.message,
        readyState: mongoose.connection.readyState,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

/**
 * Enhanced Database Connection with Retry Logic
 */
export class DatabaseConnection {
  static async connect(uri, options = {}) {
    const config = { ...optimizedDbConfig, ...options };

    let retryCount = 0;
    const maxRetries = process.env.DB_MAX_RETRIES || 5;
    const retryDelay = process.env.DB_RETRY_DELAY || 5000;

    while (retryCount < maxRetries) {
      try {
        console.log(
          `🔄 Attempting database connection (${
            retryCount + 1
          }/${maxRetries})...`
        );

        const connection = await mongoose.connect(uri, config);

        // Start monitoring
        DatabaseMonitor.startMonitoring();

        // Setup event handlers
        this.setupEventHandlers();

        console.log(
          `✅ Database connected successfully to: ${connection.connection.host}`
        );
        console.log(`📊 Connection pool size: ${config.maxPoolSize}`);
        console.log(`🔄 Read preference: ${config.readPreference}`);

        return connection;
      } catch (error) {
        retryCount++;
        console.error(
          `❌ Database connection attempt ${retryCount} failed:`,
          error.message
        );

        if (retryCount >= maxRetries) {
          console.error("💥 All database connection attempts failed");
          throw new Error("Database connection failed after maximum retries");
        }

        console.log(`⏳ Retrying in ${retryDelay}ms...`);
        await this.delay(retryDelay);
      }
    }
  }

  static setupEventHandlers() {
    const connection = mongoose.connection;

    connection.on("error", (err) => {
      console.error("❌ Database connection error:", err);
    });

    connection.on("disconnected", () => {
      console.warn("⚠️ Database disconnected");
    });

    connection.on("reconnected", () => {
      console.log("✅ Database reconnected");
    });

    connection.on("fullsetup", () => {
      console.log("✅ Database replica set connection established");
    });

    // Create indexes after connection is established
    connection.once("connected", async () => {
      try {
        await createAllIndexes();
      } catch (error) {
        console.error(
          "⚠️ Warning: Could not create database indexes:",
          error.message
        );
      }
    });
  }

  static delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  static async disconnect() {
    try {
      await mongoose.disconnect();
      console.log("✅ Database connection closed gracefully");
    } catch (error) {
      console.error("❌ Error closing database connection:", error);
    }
  }
}

/**
 * Database Health Check
 */
export class DatabaseHealthCheck {
  static async check() {
    try {
      const start = Date.now();

      // Simple ping
      await mongoose.connection.db.admin().ping();
      const pingTime = Date.now() - start;

      // Get server status
      const serverStatus = await mongoose.connection.db.admin().serverStatus();

      // Get connection stats
      const poolStats = DatabaseMonitor.getPoolStats();

      return {
        status: "healthy",
        pingTime,
        uptime: serverStatus.uptime,
        connections: serverStatus.connections,
        version: serverStatus.version,
        poolStats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: "unhealthy",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

export default {
  optimizedDbConfig,
  DatabaseMonitor,
  DatabaseConnection,
  DatabaseHealthCheck,
};
