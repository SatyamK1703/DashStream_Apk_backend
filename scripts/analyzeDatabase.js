/**
 * Database Analysis Script for DashStream
 * This script analyzes database usage patterns and provides scaling recommendations
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../src/models/userModel.js";
import Booking from "../src/models/bookingModel.js";
import Service from "../src/models/serviceModel.js";
import Payment from "../src/models/paymentModel.js";

// Load environment variables
dotenv.config();

class DatabaseAnalyzer {
  constructor() {
    this.stats = {};
    this.recommendations = [];
  }

  async connect() {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log("✅ Connected to MongoDB for analysis");
    } catch (error) {
      console.error("❌ Failed to connect to MongoDB:", error);
      process.exit(1);
    }
  }

  async analyzeCollectionStats() {
    console.log("\n📊 Analyzing Collection Statistics...");

    const collections = [
      { name: "Users", model: User },
      { name: "Bookings", model: Booking },
      { name: "Services", model: Service },
      { name: "Payments", model: Payment },
    ];

    for (const collection of collections) {
      try {
        const count = await collection.model.countDocuments();
        const sampleDoc = await collection.model.findOne().lean();
        const avgDocSize = sampleDoc ? JSON.stringify(sampleDoc).length : 0;

        // Get recent growth (last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const recentCount = await collection.model.countDocuments({
          createdAt: { $gte: thirtyDaysAgo },
        });

        this.stats[collection.name] = {
          totalDocuments: count,
          avgDocumentSize: avgDocSize,
          recentGrowth: recentCount,
          estimatedTotalSize: (count * avgDocSize) / (1024 * 1024), // MB
          growthRate:
            count > 0 ? ((recentCount / count) * 100).toFixed(2) + "%" : "0%",
        };

        console.log(
          `${collection.name}: ${count} documents, ~${avgDocSize} bytes avg, ${recentCount} new in 30 days`
        );
      } catch (error) {
        console.error(`Error analyzing ${collection.name}:`, error.message);
      }
    }
  }

  async analyzeQueryPatterns() {
    console.log("\n🔍 Analyzing Common Query Patterns...");

    try {
      // Analyze booking query patterns
      const bookingsByStatus = await Booking.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

      const bookingsByProfessional = await Booking.aggregate([
        { $group: { _id: "$professional", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]);

      // Analyze user distribution
      const usersByRole = await User.aggregate([
        { $group: { _id: "$role", count: { $sum: 1 } } },
      ]);

      // Analyze payment patterns
      const paymentsByStatus = await Payment.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]);

      this.stats.queryPatterns = {
        bookingsByStatus,
        topProfessionals: bookingsByProfessional.length,
        usersByRole,
        paymentsByStatus,
      };

      console.log("Query patterns analyzed successfully");
    } catch (error) {
      console.error("Error analyzing query patterns:", error.message);
    }
  }

  async analyzeIndexUsage() {
    console.log("\n📈 Analyzing Index Usage...");

    try {
      const db = mongoose.connection.db;
      const collections = ["users", "bookings", "services", "payments"];

      for (const collectionName of collections) {
        const indexStats = await db
          .collection(collectionName)
          .indexStats()
          .toArray();
        const indexes = await db.collection(collectionName).indexes();

        this.stats[`${collectionName}Indexes`] = {
          totalIndexes: indexes.length,
          indexNames: indexes.map((idx) => idx.name),
          usage: indexStats.map((stat) => ({
            name: stat.name,
            usageCount: stat.accesses?.ops || 0,
          })),
        };

        console.log(`${collectionName}: ${indexes.length} indexes`);
      }
    } catch (error) {
      console.error("Error analyzing index usage:", error.message);
    }
  }

  async analyzePerformanceMetrics() {
    console.log("\n⚡ Analyzing Performance Metrics...");

    try {
      const db = mongoose.connection.db;

      // Database statistics
      const dbStats = await db.stats();

      // Server status (if available)
      let serverStatus = null;
      try {
        serverStatus = await db.admin().serverStatus();
      } catch (error) {
        console.warn("Could not get server status (permission required)");
      }

      this.stats.performance = {
        databaseSize: (dbStats.dataSize / (1024 * 1024)).toFixed(2) + " MB",
        indexSize: (dbStats.indexSize / (1024 * 1024)).toFixed(2) + " MB",
        collections: dbStats.collections,
        objects: dbStats.objects,
        avgObjSize: dbStats.avgObjSize,
        storageSize: (dbStats.storageSize / (1024 * 1024)).toFixed(2) + " MB",
      };

      if (serverStatus) {
        this.stats.performance.connections = serverStatus.connections;
        this.stats.performance.uptime = serverStatus.uptime;
      }

      console.log(`Database size: ${this.stats.performance.databaseSize}`);
      console.log(`Index size: ${this.stats.performance.indexSize}`);
    } catch (error) {
      console.error("Error analyzing performance metrics:", error.message);
    }
  }

  generateRecommendations() {
    console.log("\n💡 Generating Scaling Recommendations...");

    // Connection pool recommendations
    const totalDocs = Object.values(this.stats)
      .filter((stat) => stat.totalDocuments)
      .reduce((sum, stat) => sum + stat.totalDocuments, 0);

    if (totalDocs > 100000) {
      this.recommendations.push({
        type: "Connection Pool",
        priority: "High",
        recommendation:
          "Consider increasing maxPoolSize to 50+ for high document volume",
        reason: `Total documents: ${totalDocs.toLocaleString()}`,
      });
    }

    // Index recommendations
    if (this.stats.Bookings?.totalDocuments > 10000) {
      this.recommendations.push({
        type: "Indexing",
        priority: "High",
        recommendation:
          "Ensure compound indexes exist for booking queries (customer+status, professional+date)",
        reason: "High booking volume detected",
      });
    }

    // Sharding recommendations
    if (totalDocs > 1000000) {
      this.recommendations.push({
        type: "Database Scaling",
        priority: "Critical",
        recommendation: "Consider MongoDB sharding or read replicas",
        reason: "Document count exceeds single-instance recommendations",
      });
    }

    // Memory recommendations
    const dbSizeMB = parseFloat(this.stats.performance?.databaseSize) || 0;
    if (dbSizeMB > 1000) {
      this.recommendations.push({
        type: "Memory",
        priority: "Medium",
        recommendation:
          "Ensure adequate RAM for working set (recommended: 2x database size)",
        reason: `Database size: ${dbSizeMB}MB`,
      });
    }

    // Query optimization recommendations
    const recentGrowth = Object.values(this.stats)
      .filter((stat) => stat.recentGrowth)
      .reduce((sum, stat) => sum + stat.recentGrowth, 0);

    if (recentGrowth > 1000) {
      this.recommendations.push({
        type: "Query Optimization",
        priority: "Medium",
        recommendation:
          "Implement query projections and lean() for high-traffic endpoints",
        reason: `High recent growth: ${recentGrowth} new documents in 30 days`,
      });
    }
  }

  printReport() {
    console.log("\n" + "=".repeat(60));
    console.log("🚀 DASHSTREAM DATABASE ANALYSIS REPORT");
    console.log("=".repeat(60));

    // Collection Stats
    console.log("\n📊 COLLECTION STATISTICS:");
    Object.entries(this.stats).forEach(([key, value]) => {
      if (value.totalDocuments !== undefined) {
        console.log(`\n${key}:`);
        console.log(`  Documents: ${value.totalDocuments.toLocaleString()}`);
        console.log(`  Avg Size: ${value.avgDocumentSize} bytes`);
        console.log(
          `  Est. Total Size: ${value.estimatedTotalSize.toFixed(2)} MB`
        );
        console.log(
          `  30-day Growth: ${value.recentGrowth} (${value.growthRate})`
        );
      }
    });

    // Performance Stats
    if (this.stats.performance) {
      console.log("\n⚡ PERFORMANCE METRICS:");
      Object.entries(this.stats.performance).forEach(([key, value]) => {
        console.log(
          `  ${key}: ${
            typeof value === "object" ? JSON.stringify(value) : value
          }`
        );
      });
    }

    // Recommendations
    console.log("\n💡 SCALING RECOMMENDATIONS:");
    if (this.recommendations.length === 0) {
      console.log("  ✅ No immediate scaling concerns detected");
    } else {
      this.recommendations.forEach((rec, index) => {
        console.log(
          `\n  ${index + 1}. ${rec.type} (${rec.priority} Priority):`
        );
        console.log(`     ${rec.recommendation}`);
        console.log(`     Reason: ${rec.reason}`);
      });
    }

    console.log("\n" + "=".repeat(60));
    console.log("📈 Analysis completed at:", new Date().toISOString());
    console.log("=".repeat(60));
  }

  async disconnect() {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
  }
}

// Run the analysis
async function runAnalysis() {
  const analyzer = new DatabaseAnalyzer();

  try {
    await analyzer.connect();
    await analyzer.analyzeCollectionStats();
    await analyzer.analyzeQueryPatterns();
    await analyzer.analyzeIndexUsage();
    await analyzer.analyzePerformanceMetrics();
    analyzer.generateRecommendations();
    analyzer.printReport();
  } catch (error) {
    console.error("❌ Analysis failed:", error);
  } finally {
    await analyzer.disconnect();
  }
}

// Execute if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAnalysis();
}

export default DatabaseAnalyzer;
