/**
 * MongoDB Performance Monitoring and Slow Query Detection
 * This utility helps identify performance bottlenecks and monitor database health
 */

import mongoose from "mongoose";

class MongoMonitoring {
  constructor() {
    this.slowQueryThreshold = 100; // 100ms
    this.queryStats = new Map();
    this.enableProfiling = process.env.NODE_ENV === "production";
  }

  /**
   * Initialize MongoDB monitoring
   */
  async initialize() {
    try {
      // Enable slow query logging in development
      if (process.env.NODE_ENV === "development") {
        await this.enableSlowQueryLogging();
      }

      // Set up connection monitoring
      this.setupConnectionMonitoring();

      // Set up performance monitoring
      this.setupPerformanceMonitoring();

      console.log("✅ MongoDB monitoring initialized");
    } catch (error) {
      console.error("❌ Failed to initialize MongoDB monitoring:", error);
    }
  }

  /**
   * Enable slow query logging
   */
  async enableSlowQueryLogging() {
    try {
      const db = mongoose.connection.db;

      // Set profiling level 1 (log slow operations)
      await db.admin().runCommand({
        profile: 1,
        slowms: this.slowQueryThreshold,
        sampleRate: 1.0,
      });

      console.log(
        `📊 Slow query logging enabled (threshold: ${this.slowQueryThreshold}ms)`
      );
    } catch (error) {
      console.warn("⚠️ Could not enable slow query logging:", error.message);
    }
  }

  /**
   * Set up connection monitoring
   */
  setupConnectionMonitoring() {
    const connection = mongoose.connection;

    // Monitor connection pool
    setInterval(() => {
      if (connection.readyState === 1) {
        const poolStats = this.getConnectionPoolStats();

        if (poolStats.availableConnections < 3) {
          console.warn("⚠️ Low available connections in pool:", poolStats);
        }

        // Log every 5 minutes in development
        if (process.env.NODE_ENV === "development") {
          console.log("📊 Connection Pool Stats:", poolStats);
        }
      }
    }, 300000); // 5 minutes
  }

  /**
   * Set up performance monitoring using Mongoose middleware
   */
  setupPerformanceMonitoring() {
    // Monitor all find operations
    mongoose.plugin((schema) => {
      schema.pre(/^find/, function () {
        this._startTime = Date.now();
        this._operation = this.getQuery();
      });

      schema.post(/^find/, function (result) {
        const duration = Date.now() - this._startTime;

        if (duration > this.slowQueryThreshold) {
          this.logSlowQuery(
            "find",
            this._operation,
            duration,
            result?.length || 0
          );
        }

        this.updateQueryStats("find", duration);
      });

      // Monitor save operations
      schema.pre("save", function () {
        this._startTime = Date.now();
      });

      schema.post("save", function () {
        const duration = Date.now() - this._startTime;

        if (duration > this.slowQueryThreshold) {
          this.logSlowQuery("save", { _id: this._id }, duration);
        }

        this.updateQueryStats("save", duration);
      });

      // Monitor aggregate operations
      schema.pre("aggregate", function () {
        this._startTime = Date.now();
        this._pipeline = this.getPipeline();
      });

      schema.post("aggregate", function (result) {
        const duration = Date.now() - this._startTime;

        if (duration > this.slowQueryThreshold) {
          this.logSlowQuery(
            "aggregate",
            this._pipeline,
            duration,
            result?.length || 0
          );
        }

        this.updateQueryStats("aggregate", duration);
      });
    });
  }

  /**
   * Get connection pool statistics
   */
  getConnectionPoolStats() {
    const db = mongoose.connection.db;
    const client = db?.client;

    if (!client) {
      return { error: "Client not available" };
    }

    try {
      const topology = client.topology;
      const poolStats = {
        availableConnections: topology?.s?.pool?.availableConnectionCount || 0,
        checkedOutConnections:
          topology?.s?.pool?.checkedOutConnectionCount || 0,
        maxPoolSize: topology?.s?.options?.maxPoolSize || 0,
        minPoolSize: topology?.s?.options?.minPoolSize || 0,
        totalConnections:
          (topology?.s?.pool?.availableConnectionCount || 0) +
          (topology?.s?.pool?.checkedOutConnectionCount || 0),
      };

      return poolStats;
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Log slow queries
   */
  logSlowQuery(operation, query, duration, resultCount = null) {
    const logData = {
      timestamp: new Date().toISOString(),
      operation,
      duration: `${duration}ms`,
      query: JSON.stringify(query),
      ...(resultCount !== null && { resultCount }),
    };

    console.warn("🐌 SLOW QUERY DETECTED:", logData);

    // In production, you might want to send this to a monitoring service
    if (this.enableProfiling) {
      this.sendToMonitoringService(logData);
    }
  }

  /**
   * Update query statistics
   */
  updateQueryStats(operation, duration) {
    const stats = this.queryStats.get(operation) || {
      count: 0,
      totalTime: 0,
      avgTime: 0,
      slowQueries: 0,
    };

    stats.count++;
    stats.totalTime += duration;
    stats.avgTime = stats.totalTime / stats.count;

    if (duration > this.slowQueryThreshold) {
      stats.slowQueries++;
    }

    this.queryStats.set(operation, stats);
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    const stats = {};

    for (const [operation, data] of this.queryStats.entries()) {
      stats[operation] = {
        ...data,
        slowQueryPercentage:
          ((data.slowQueries / data.count) * 100).toFixed(2) + "%",
      };
    }

    return {
      ...stats,
      connectionPool: this.getConnectionPoolStats(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Check database health
   */
  async checkDatabaseHealth() {
    try {
      const start = Date.now();
      await mongoose.connection.db.admin().ping();
      const latency = Date.now() - start;

      const health = {
        status: "healthy",
        latency: `${latency}ms`,
        connectionState: mongoose.connection.readyState,
        connectionPool: this.getConnectionPoolStats(),
        timestamp: new Date().toISOString(),
      };

      if (latency > 1000) {
        health.status = "slow";
        health.warning = "High database latency detected";
      }

      return health;
    } catch (error) {
      return {
        status: "unhealthy",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Send monitoring data to external service (placeholder)
   */
  sendToMonitoringService(data) {
    // Implement integration with monitoring services like:
    // - New Relic
    // - DataDog
    // - MongoDB Atlas monitoring
    // - Custom analytics endpoint

    console.log("📡 Sending to monitoring service:", data);
  }

  /**
   * Get slow query recommendations
   */
  getOptimizationRecommendations() {
    const recommendations = [];

    for (const [operation, stats] of this.queryStats.entries()) {
      if (stats.slowQueries > 0) {
        recommendations.push({
          operation,
          issue: `${stats.slowQueries} slow ${operation} operations detected`,
          recommendation: this.getOperationRecommendation(operation, stats),
          priority: stats.slowQueries > 10 ? "high" : "medium",
        });
      }
    }

    const poolStats = this.getConnectionPoolStats();
    if (poolStats.availableConnections < 3) {
      recommendations.push({
        operation: "connection_pool",
        issue: "Low available connections in pool",
        recommendation:
          "Consider increasing maxPoolSize or optimizing query patterns",
        priority: "high",
      });
    }

    return recommendations;
  }

  /**
   * Get operation-specific recommendations
   */
  getOperationRecommendation(operation, stats) {
    const recommendations = {
      find: "Consider adding indexes, using projections, or implementing pagination",
      save: "Review document size and consider batch operations",
      aggregate: "Optimize pipeline stages and ensure proper indexing",
    };

    return (
      recommendations[operation] ||
      "Review query patterns and indexing strategy"
    );
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.queryStats.clear();
    console.log("📊 Query statistics reset");
  }
}

// Export singleton instance
const mongoMonitoring = new MongoMonitoring();

export default mongoMonitoring;

// Export class for testing
export { MongoMonitoring };
