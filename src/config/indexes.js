/**
 * Database Index Configuration for DashStream Backend
 * Sets up optimized indexes for common query patterns
 */

import User from "../models/userModel.js";
import Service from "../models/serviceModel.js";
import Booking from "../models/bookingModel.js";
import Notification from "../models/notificationModel.js";
import Payment from "../models/paymentModel.js";
import Address from "../models/addressModel.js";
import Offer from "../models/offerModel.js";
import Vehicle from "../models/vehicleModel.js";
import Membership from "../models/membershipModel.js";

/**
 * Index configuration for each model
 */
const INDEX_CONFIGS = {
  User: [
    // Auth queries - most critical
    { fields: { phone: 1 }, options: { unique: true, background: true } },
    { fields: { email: 1 }, options: { sparse: true, background: true } },

    // Professional queries
    { fields: { role: 1, isAvailable: 1 }, options: { background: true } },
    { fields: { role: 1, status: 1 }, options: { background: true } },

    // Location-based queries for professionals
    {
      fields: { "currentLocation.coordinates": "2dsphere" },
      options: { background: true },
    },

    // Performance optimization
    { fields: { role: 1, totalRatings: -1 }, options: { background: true } },
    { fields: { lastActive: -1 }, options: { background: true } },

    // Compound indexes for complex queries
    {
      fields: { role: 1, isAvailable: 1, status: 1 },
      options: { background: true },
    },
  ],

  Service: [
    // Category-based queries (most common)
    { fields: { category: 1, isActive: 1 }, options: { background: true } },
    { fields: { isActive: 1, isPopular: 1 }, options: { background: true } },

    // Search and sorting
    {
      fields: { title: "text", description: "text", tags: "text" },
      options: { background: true },
    },
    { fields: { rating: -1, numReviews: -1 }, options: { background: true } },
    { fields: { popularity: -1, rating: -1 }, options: { background: true } },

    // Price-based queries
    { fields: { vehicleType: 1, price: 1 }, options: { background: true } },

    // Admin queries
    { fields: { createdAt: -1 }, options: { background: true } },
  ],

  Booking: [
    // User-specific queries (most critical)
    { fields: { customer: 1, createdAt: -1 }, options: { background: true } },
    {
      fields: { professional: 1, createdAt: -1 },
      options: { background: true },
    },

    // Status-based queries
    { fields: { status: 1, scheduledDate: 1 }, options: { background: true } },
    { fields: { customer: 1, status: 1 }, options: { background: true } },
    { fields: { professional: 1, status: 1 }, options: { background: true } },

    // Date-based queries
    {
      fields: { scheduledDate: 1, scheduledTime: 1 },
      options: { background: true },
    },
    { fields: { createdAt: -1 }, options: { background: true } },

    // Payment queries
    {
      fields: { paymentStatus: 1, createdAt: -1 },
      options: { background: true },
    },

    // Location-based queries
    {
      fields: { "location.coordinates": "2dsphere" },
      options: { background: true },
    },

    // Compound indexes for dashboard queries
    {
      fields: { professional: 1, status: 1, scheduledDate: 1 },
      options: { background: true },
    },
    {
      fields: { customer: 1, paymentStatus: 1, status: 1 },
      options: { background: true },
    },
  ],

  Notification: [
    // User-specific queries with sorting
    { fields: { recipient: 1, createdAt: -1 }, options: { background: true } },
    {
      fields: { recipient: 1, read: 1, createdAt: -1 },
      options: { background: true },
    },

    // Bulk operations
    { fields: { read: 1, createdAt: -1 }, options: { background: true } },
    { fields: { type: 1, createdAt: -1 }, options: { background: true } },
  ],

  Payment: [
    // Booking-related queries
    { fields: { bookingId: 1 }, options: { background: true } },
    { fields: { userId: 1, createdAt: -1 }, options: { background: true } },

    // Status and method queries
    { fields: { status: 1, createdAt: -1 }, options: { background: true } },
    { fields: { paymentMethod: 1, status: 1 }, options: { background: true } },

    // External IDs for reconciliation
    {
      fields: { razorpayOrderId: 1 },
      options: { sparse: true, background: true },
    },
    {
      fields: { razorpayPaymentId: 1 },
      options: { sparse: true, background: true },
    },

    // Amount-based queries for reporting
    {
      fields: { amount: 1, currency: 1, createdAt: -1 },
      options: { background: true },
    },
  ],

  Address: [
    // User-specific queries
    { fields: { user: 1, isDefault: 1 }, options: { background: true } },
    { fields: { user: 1, type: 1 }, options: { background: true } },

    // Location-based queries
    {
      fields: { "location.coordinates": "2dsphere" },
      options: { background: true },
    },
  ],

  Offer: [
    // Active offers
    {
      fields: { isActive: 1, validFrom: 1, validTo: 1 },
      options: { background: true },
    },
    { fields: { type: 1, isActive: 1 }, options: { background: true } },

    // Service-specific offers
    {
      fields: { applicableServices: 1, isActive: 1 },
      options: { background: true },
    },
  ],

  Vehicle: [
    // User-specific queries
    { fields: { owner: 1, isDefault: 1 }, options: { background: true } },
    { fields: { owner: 1, type: 1 }, options: { background: true } },
  ],

  Membership: [
    // User-specific queries
    { fields: { userId: 1, status: 1 }, options: { background: true } },
    { fields: { userId: 1, createdAt: -1 }, options: { background: true } },

    // Plan-based queries
    { fields: { planId: 1, status: 1 }, options: { background: true } },

    // Order-based queries for webhooks
    { fields: { orderId: 1 }, options: { unique: true, sparse: true, background: true } },

    // Status and date queries
    { fields: { status: 1, validUntil: 1 }, options: { background: true } },
    { fields: { validUntil: 1 }, options: { background: true } },
  ],
};

/**
 * Create indexes for a specific model
 */
const createIndexesForModel = async (Model, modelName, indexes) => {
  try {
    console.log(`📊 Creating indexes for ${modelName}...`);

    for (const indexConfig of indexes) {
      const { fields, options = {} } = indexConfig;

      try {
        await Model.collection.createIndex(fields, {
          ...options,
          name: `${modelName.toLowerCase()}_${Object.keys(fields).join("_")}`,
        });

        const fieldNames = Object.keys(fields).join(", ");
        console.log(`  ✅ Created index on: ${fieldNames}`);
      } catch (error) {
        if (error.code === 85) {
          // Index already exists - this is fine
          console.log(
            `  ⚡ Index already exists: ${Object.keys(fields).join(", ")}`
          );
        } else {
          console.error(
            `  ❌ Failed to create index on ${Object.keys(fields).join(", ")}:`,
            error.message
          );
        }
      }
    }
  } catch (error) {
    console.error(
      `❌ Failed to create indexes for ${modelName}:`,
      error.message
    );
  }
};

/**
 * Create all database indexes
 */
export const createAllIndexes = async () => {
  console.log("🚀 Setting up database indexes...");

  const models = {
    User,
    Service,
    Booking,
    Notification,
    Payment,
    Address,
    Offer,
    Vehicle,
    Membership,
  };

  const indexPromises = Object.entries(INDEX_CONFIGS).map(
    ([modelName, indexes]) => {
      const Model = models[modelName];
      if (Model) {
        return createIndexesForModel(Model, modelName, indexes);
      } else {
        console.warn(`⚠️ Model ${modelName} not found, skipping indexes`);
        return Promise.resolve();
      }
    }
  );

  try {
    await Promise.all(indexPromises);
    console.log("✅ All database indexes created successfully!");
  } catch (error) {
    console.error("❌ Error creating database indexes:", error.message);
    throw error;
  }
};

/**
 * Drop all custom indexes (for testing/reset)
 */
export const dropAllIndexes = async () => {
  console.log("🧹 Dropping custom indexes...");

  const models = {
    User,
    Service,
    Booking,
    Notification,
    Payment,
    Address,
    Offer,
    Vehicle,
    Membership,
  };

  for (const [modelName, Model] of Object.entries(models)) {
    try {
      const indexes = await Model.collection.getIndexes();

      for (const indexName of Object.keys(indexes)) {
        // Don't drop the _id index or other MongoDB default indexes
        if (indexName !== "_id_" && !indexName.startsWith("_id_")) {
          try {
            await Model.collection.dropIndex(indexName);
            console.log(`  ✅ Dropped ${modelName} index: ${indexName}`);
          } catch (error) {
            console.log(
              `  ⚠️ Could not drop ${modelName} index ${indexName}: ${error.message}`
            );
          }
        }
      }
    } catch (error) {
      console.error(
        `❌ Error dropping indexes for ${modelName}:`,
        error.message
      );
    }
  }

  console.log("✅ Custom indexes cleanup completed!");
};

/**
 * Get index statistics for monitoring
 */
export const getIndexStats = async () => {
  const models = {
    User,
    Service,
    Booking,
    Notification,
    Payment,
    Address,
    Offer,
    Vehicle,
    Membership,
  };
  const stats = {};

  for (const [modelName, Model] of Object.entries(models)) {
    try {
      const indexes = await Model.collection.getIndexes();
      const count = await Model.countDocuments();

      stats[modelName] = {
        indexCount: Object.keys(indexes).length,
        indexes: Object.keys(indexes),
        count: count,
      };
    } catch (error) {
      stats[modelName] = { error: error.message };
    }
  }

  return stats;
};

export default {
  createAllIndexes,
  dropAllIndexes,
  getIndexStats,
  INDEX_CONFIGS,
};
