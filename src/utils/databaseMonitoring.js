/**
 * Advanced Database Monitoring System for DashStream Backend
 * Monitors query performance, connection health, and provides alerts
 */

import mongoose from "mongoose";
import { cache, CACHE_TTL } from "../config/cache.js";

/**
 * Query Performance Monitor
 */
export class QueryPerformanceMonitor {
  constructor() {
    this.queryStats = new Map();
    this.slowQueryThreshold = process.env.SLOW_QUERY_THRESHOLD || 1000; // 1 second
    this.alertThreshold = process.env.ALERT_THRESHOLD || 5000; // 5 seconds
    this.isMonitoring = false;
  }

  /**
   * Start monitoring database queries
   */
  startMonitoring() {
    if (this.isMonitoring) {
      return;
    }

    console.log("🔍 Starting database query monitoring...");
    this.isMonitoring = true;

    const db = mongoose.connection.db;

    // Monitor all database commands
    db.on("commandStarted", (event) => {
      this.handleCommandStart(event);
    });

    db.on("commandSucceeded", (event) => {
      this.handleCommandSuccess(event);
    });

    db.on("commandFailed", (event) => {
      this.handleCommandFailed(event);
    });

    // Periodic stats logging
    setInterval(() => {
      this.logPerformanceStats();
    }, 60000); // Every minute

    // Periodic cleanup of old stats
    setInterval(() => {
      this.cleanupOldStats();
    }, 300000); // Every 5 minutes
  }

  /**
   * Handle command start event
   */
  handleCommandStart(event) {
    const queryKey = this.generateQueryKey(event);

    this.queryStats.set(event.requestId, {
      queryKey,
      command: event.commandName,
      collection: this.extractCollection(event),
      startTime: Date.now(),
      filter: this.extractFilter(event),
    });
  }

  /**
   * Handle command success event
   */
  handleCommandSuccess(event) {
    const queryInfo = this.queryStats.get(event.requestId);
    if (!queryInfo) return;

    const duration = event.duration;
    const endTime = Date.now();

    // Update query statistics
    this.updateQueryStats(queryInfo, duration, true);

    // Check for slow queries
    if (duration > this.slowQueryThreshold) {
      this.logSlowQuery(queryInfo, duration);
    }

    // Check for critical alerts
    if (duration > this.alertThreshold) {
      this.sendAlert(queryInfo, duration);
    }

    // Clean up
    this.queryStats.delete(event.requestId);
  }

  /**
   * Handle command failure event
   */
  handleCommandFailed(event) {
    const queryInfo = this.queryStats.get(event.requestId);
    if (!queryInfo) return;

    const duration = Date.now() - queryInfo.startTime;

    // Update query statistics
    this.updateQueryStats(queryInfo, duration, false);

    // Log failed query
    console.error(
      `❌ Query failed: ${queryInfo.command} on ${queryInfo.collection}`,
      {
        duration: `${duration}ms`,
        error: event.failure.errmsg,
        filter: queryInfo.filter,
      }
    );

    // Clean up
    this.queryStats.delete(event.requestId);
  }

  /**
   * Generate unique query key for statistics
   */
  generateQueryKey(event) {
    const command = event.commandName;
    const collection = this.extractCollection(event);
    const operation = this.extractOperation(event);

    return `${command}:${collection}:${operation}`;
  }

  /**
   * Extract collection name from event
   */
  extractCollection(event) {
    const command = event.command;
    return (
      command.find ||
      command.insert ||
      command.update ||
      command.delete ||
      command.aggregate ||
      command.collection ||
      "unknown"
    );
  }

  /**
   * Extract operation type from event
   */
  extractOperation(event) {
    const command = event.command;

    if (command.find) return "read";
    if (command.insert) return "insert";
    if (command.update || command.findAndModify) return "update";
    if (command.delete) return "delete";
    if (command.aggregate) return "aggregate";
    if (command.count) return "count";

    return "other";
  }

  /**
   * Extract filter/query from event
   */
  extractFilter(event) {
    const command = event.command;

    if (command.filter) return command.filter;
    if (command.q) return command.q; // findAndModify
    if (command.pipeline)
      return { pipeline: command.pipeline.length + " stages" };

    return {};
  }

  /**
   * Update query statistics
   */
  updateQueryStats(queryInfo, duration, success) {
    const key = queryInfo.queryKey;

    if (!this.globalStats) {
      this.globalStats = new Map();
    }

    let stats = this.globalStats.get(key);
    if (!stats) {
      stats = {
        count: 0,
        totalDuration: 0,
        avgDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        errors: 0,
        lastExecuted: Date.now(),
        command: queryInfo.command,
        collection: queryInfo.collection,
      };
      this.globalStats.set(key, stats);
    }

    stats.count++;
    stats.lastExecuted = Date.now();

    if (success) {
      stats.totalDuration += duration;
      stats.avgDuration = stats.totalDuration / stats.count;
      stats.minDuration = Math.min(stats.minDuration, duration);
      stats.maxDuration = Math.max(stats.maxDuration, duration);
    } else {
      stats.errors++;
    }
  }

  /**
   * Log slow query warning
   */
  logSlowQuery(queryInfo, duration) {
    console.warn(`⚠️ SLOW QUERY DETECTED:`, {
      command: queryInfo.command,
      collection: queryInfo.collection,
      duration: `${duration}ms`,
      filter: JSON.stringify(queryInfo.filter),
      threshold: `${this.slowQueryThreshold}ms`,
    });
  }

  /**
   * Send critical performance alert
   */
  sendAlert(queryInfo, duration) {
    console.error(`🚨 CRITICAL PERFORMANCE ALERT:`, {
      command: queryInfo.command,
      collection: queryInfo.collection,
      duration: `${duration}ms`,
      filter: JSON.stringify(queryInfo.filter),
      threshold: `${this.alertThreshold}ms`,
      timestamp: new Date().toISOString(),
    });

    // In production, you might want to send to external monitoring service
    if (process.env.NODE_ENV === "production") {
      this.sendExternalAlert(queryInfo, duration);
    }
  }

  /**
   * Send alert to external monitoring service
   */
  async sendExternalAlert(queryInfo, duration) {
    // Implement external alert sending (e.g., Slack, email, monitoring service)
    // This is a placeholder for your specific alert system
    console.log("📡 Sending external alert...");
  }

  /**
   * Log performance statistics
   */
  logPerformanceStats() {
    if (!this.globalStats || this.globalStats.size === 0) {
      return;
    }

    console.log("\n📊 DATABASE PERFORMANCE STATS (Last minute):");

    const sortedStats = Array.from(this.globalStats.entries())
      .sort(([, a], [, b]) => b.avgDuration - a.avgDuration)
      .slice(0, 10); // Top 10 slowest queries

    sortedStats.forEach(([queryKey, stats]) => {
      console.log(`  ${queryKey}:`);
      console.log(`    Count: ${stats.count}`);
      console.log(`    Avg Duration: ${stats.avgDuration.toFixed(2)}ms`);
      console.log(
        `    Min/Max: ${stats.minDuration}ms / ${stats.maxDuration}ms`
      );
      console.log(`    Errors: ${stats.errors}`);
      console.log(
        `    Last Executed: ${new Date(
          stats.lastExecuted
        ).toLocaleTimeString()}`
      );
      console.log("");
    });
  }

  /**
   * Clean up old statistics
   */
  cleanupOldStats() {
    if (!this.globalStats) return;

    const fiveMinutesAgo = Date.now() - 300000;
    let cleanedCount = 0;

    for (const [key, stats] of this.globalStats.entries()) {
      if (stats.lastExecuted < fiveMinutesAgo) {
        this.globalStats.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old query statistics`);
    }
  }

  /**
   * Get performance report
   */
  getPerformanceReport() {
    if (!this.globalStats) {
      return { message: "No statistics available" };
    }

    const stats = Array.from(this.globalStats.values());
    const totalQueries = stats.reduce((sum, s) => sum + s.count, 0);
    const totalErrors = stats.reduce((sum, s) => sum + s.errors, 0);
    const avgResponseTime =
      stats.length > 0
        ? stats.reduce((sum, s) => sum + s.avgDuration, 0) / stats.length
        : 0;

    const slowQueries = stats.filter(
      (s) => s.avgDuration > this.slowQueryThreshold
    );

    return {
      summary: {
        totalQueries,
        totalErrors,
        errorRate:
          totalQueries > 0
            ? ((totalErrors / totalQueries) * 100).toFixed(2)
            : 0,
        avgResponseTime: avgResponseTime.toFixed(2),
        slowQueryCount: slowQueries.length,
        uniqueQueryTypes: this.globalStats.size,
      },
      slowQueries: slowQueries
        .sort((a, b) => b.avgDuration - a.avgDuration)
        .slice(0, 5)
        .map((s) => ({
          query: s.command + ":" + s.collection,
          avgDuration: s.avgDuration.toFixed(2),
          count: s.count,
          errors: s.errors,
        })),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    this.isMonitoring = false;
    console.log("⏹️ Database query monitoring stopped");
  }
}

/**
 * Connection Health Monitor
 */
export class ConnectionHealthMonitor {
  constructor() {
    this.healthChecks = [];
    this.isMonitoring = false;
    this.checkInterval = process.env.HEALTH_CHECK_INTERVAL || 30000; // 30 seconds
  }

  /**
   * Start health monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) {
      return;
    }

    console.log("💓 Starting database health monitoring...");
    this.isMonitoring = true;

    // Initial health check
    this.performHealthCheck();

    // Periodic health checks
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.checkInterval);

    // Monitor connection events
    this.setupConnectionEventMonitoring();
  }

  /**
   * Setup connection event monitoring
   */
  setupConnectionEventMonitoring() {
    const connection = mongoose.connection;

    connection.on("connected", () => {
      console.log("✅ Database connection established");
      this.recordHealthCheck("connection", "healthy", "Connected successfully");
    });

    connection.on("disconnected", () => {
      console.warn("⚠️ Database connection lost");
      this.recordHealthCheck("connection", "unhealthy", "Connection lost");
    });

    connection.on("error", (error) => {
      console.error("❌ Database connection error:", error.message);
      this.recordHealthCheck("connection", "error", error.message);
    });

    connection.on("reconnected", () => {
      console.log("✅ Database reconnected");
      this.recordHealthCheck(
        "connection",
        "recovered",
        "Reconnected successfully"
      );
    });
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck() {
    const startTime = Date.now();

    try {
      // Check connection state
      const connectionHealth = this.checkConnectionState();

      // Ping database
      const pingResult = await this.pingDatabase();

      // Check collection stats
      const collectionStats = await this.checkCollectionStats();

      // Check replica set status (if applicable)
      const replicaStatus = await this.checkReplicaSetStatus();

      const totalTime = Date.now() - startTime;

      const healthStatus = {
        timestamp: new Date().toISOString(),
        overall: "healthy",
        responseTime: totalTime,
        checks: {
          connection: connectionHealth,
          ping: pingResult,
          collections: collectionStats,
          replicaSet: replicaStatus,
        },
      };

      // Determine overall health
      const hasErrors = Object.values(healthStatus.checks).some(
        (check) => check?.status === "error" || check?.status === "unhealthy"
      );

      if (hasErrors) {
        healthStatus.overall = "degraded";
      }

      this.recordHealthCheck(
        "system",
        healthStatus.overall,
        "Health check completed",
        healthStatus
      );

      // Cache the health status
      await cache.set("db_health_status", healthStatus, CACHE_TTL.SHORT);

      return healthStatus;
    } catch (error) {
      console.error("❌ Health check failed:", error.message);

      const errorStatus = {
        timestamp: new Date().toISOString(),
        overall: "unhealthy",
        error: error.message,
        responseTime: Date.now() - startTime,
      };

      this.recordHealthCheck("system", "unhealthy", error.message, errorStatus);

      return errorStatus;
    }
  }

  /**
   * Check MongoDB connection state
   */
  checkConnectionState() {
    const connection = mongoose.connection;
    const states = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
    };

    return {
      status: connection.readyState === 1 ? "healthy" : "unhealthy",
      state: states[connection.readyState] || "unknown",
      host: connection.host,
      port: connection.port,
      name: connection.name,
    };
  }

  /**
   * Ping database to check responsiveness
   */
  async pingDatabase() {
    try {
      const startTime = Date.now();
      await mongoose.connection.db.admin().ping();
      const pingTime = Date.now() - startTime;

      return {
        status: "healthy",
        responseTime: pingTime,
        message: `Database responded in ${pingTime}ms`,
      };
    } catch (error) {
      return {
        status: "error",
        error: error.message,
        message: "Database ping failed",
      };
    }
  }

  /**
   * Check collection statistics
   */
  async checkCollectionStats() {
    try {
      const collections = await mongoose.connection.db
        .listCollections()
        .toArray();
      const stats = [];

      for (const collection of collections.slice(0, 5)) {
        // Check first 5 collections
        try {
          const collStats = await mongoose.connection.db
            .collection(collection.name)
            .stats();
          stats.push({
            name: collection.name,
            count: collStats.count,
            size: collStats.size,
            avgObjSize: collStats.avgObjSize,
            indexes: collStats.nindexes,
          });
        } catch (error) {
          stats.push({
            name: collection.name,
            error: error.message,
          });
        }
      }

      return {
        status: "healthy",
        collectionsCount: collections.length,
        sampleStats: stats,
      };
    } catch (error) {
      return {
        status: "error",
        error: error.message,
        message: "Failed to get collection statistics",
      };
    }
  }

  /**
   * Check replica set status
   */
  async checkReplicaSetStatus() {
    try {
      const status = await mongoose.connection.db.admin().replSetGetStatus();

      return {
        status: "healthy",
        setName: status.set,
        members: status.members.length,
        primary: status.members.find((m) => m.stateStr === "PRIMARY")?.name,
        healthy: status.members.every((m) => m.health === 1),
      };
    } catch (error) {
      if (error.message.includes("not running with --replSet")) {
        return {
          status: "not_applicable",
          message: "Single instance (not a replica set)",
        };
      }

      return {
        status: "error",
        error: error.message,
        message: "Failed to get replica set status",
      };
    }
  }

  /**
   * Record health check result
   */
  recordHealthCheck(type, status, message, details = null) {
    const record = {
      timestamp: Date.now(),
      type,
      status,
      message,
      details,
    };

    this.healthChecks.push(record);

    // Keep only last 100 health checks
    if (this.healthChecks.length > 100) {
      this.healthChecks = this.healthChecks.slice(-100);
    }

    // Log significant events
    if (status === "unhealthy" || status === "error") {
      console.warn(`🏥 Health Check Alert: ${type} - ${status} - ${message}`);
    }
  }

  /**
   * Get health history
   */
  getHealthHistory(limit = 20) {
    return this.healthChecks.slice(-limit).map((check) => ({
      timestamp: new Date(check.timestamp).toISOString(),
      type: check.type,
      status: check.status,
      message: check.message,
    }));
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring() {
    this.isMonitoring = false;

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    console.log("⏹️ Database health monitoring stopped");
  }
}

/**
 * Database Metrics Collector
 */
export class DatabaseMetricsCollector {
  constructor() {
    this.metrics = {
      queries: {
        total: 0,
        successful: 0,
        failed: 0,
        slow: 0,
      },
      connections: {
        active: 0,
        available: 0,
        created: 0,
        destroyed: 0,
      },
      performance: {
        avgResponseTime: 0,
        p95ResponseTime: 0,
        maxResponseTime: 0,
      },
    };
  }

  /**
   * Get comprehensive database metrics
   */
  async getMetrics() {
    try {
      const serverStatus = await mongoose.connection.db.admin().serverStatus();
      const dbStats = await mongoose.connection.db.stats();

      return {
        timestamp: new Date().toISOString(),
        server: {
          version: serverStatus.version,
          uptime: serverStatus.uptime,
          connections: serverStatus.connections,
          network: serverStatus.network,
          opcounters: serverStatus.opcounters,
          mem: serverStatus.mem,
          metrics: serverStatus.metrics,
        },
        database: {
          collections: dbStats.collections,
          objects: dbStats.objects,
          avgObjSize: dbStats.avgObjSize,
          dataSize: dbStats.dataSize,
          storageSize: dbStats.storageSize,
          indexes: dbStats.indexes,
          indexSize: dbStats.indexSize,
        },
        application: this.metrics,
      };
    } catch (error) {
      console.error("❌ Failed to collect database metrics:", error.message);
      return {
        timestamp: new Date().toISOString(),
        error: error.message,
        application: this.metrics,
      };
    }
  }

  /**
   * Update application metrics
   */
  updateMetrics(type, value) {
    if (this.metrics[type]) {
      Object.assign(this.metrics[type], value);
    }
  }
}

/**
 * Main Database Monitor
 */
export class DatabaseMonitor {
  constructor() {
    this.queryMonitor = new QueryPerformanceMonitor();
    this.healthMonitor = new ConnectionHealthMonitor();
    this.metricsCollector = new DatabaseMetricsCollector();
  }

  /**
   * Start all monitoring
   */
  startMonitoring() {
    console.log("🚀 Starting comprehensive database monitoring...");

    this.queryMonitor.startMonitoring();
    this.healthMonitor.startMonitoring();

    console.log("✅ Database monitoring started successfully");
  }

  /**
   * Stop all monitoring
   */
  stopMonitoring() {
    console.log("⏹️ Stopping database monitoring...");

    this.queryMonitor.stopMonitoring();
    this.healthMonitor.stopMonitoring();

    console.log("✅ Database monitoring stopped");
  }

  /**
   * Get comprehensive monitoring report
   */
  async getMonitoringReport() {
    const [performanceReport, healthStatus, metrics] = await Promise.all([
      this.queryMonitor.getPerformanceReport(),
      cache.get("db_health_status") || { status: "unknown" },
      this.metricsCollector.getMetrics(),
    ]);

    return {
      timestamp: new Date().toISOString(),
      performance: performanceReport,
      health: healthStatus,
      metrics,
      uptime: process.uptime(),
    };
  }
}

// Export singleton instance
export const databaseMonitor = new DatabaseMonitor();

export default {
  DatabaseMonitor,
  QueryPerformanceMonitor,
  ConnectionHealthMonitor,
  DatabaseMetricsCollector,
  databaseMonitor,
};
