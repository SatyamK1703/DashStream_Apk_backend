/**
 * Pre/Post Hook Optimizations for DashStream Backend
 * Guidelines and utilities for optimizing Mongoose middleware
 */

/**
 * OPTIMIZATION GUIDELINES FOR PRE/POST HOOKS
 *
 * 1. MINIMIZE HOOK OPERATIONS
 *    - Keep hooks lightweight and focused
 *    - Avoid heavy computations in pre hooks
 *    - Use async operations carefully
 *
 * 2. OPTIMIZE DATABASE QUERIES IN HOOKS
 *    - Use projections to fetch only needed fields
 *    - Avoid N+1 queries with proper population
 *    - Use lean queries where possible
 *
 * 3. CONDITIONAL EXECUTION
 *    - Use conditions to skip unnecessary operations
 *    - Check if fields are modified before processing
 *
 * 4. BATCH OPERATIONS
 *    - Group operations when possible
 *    - Use bulk operations for multiple documents
 *
 * 5. CACHING STRATEGY
 *    - Invalidate caches efficiently
 *    - Use selective cache invalidation
 *
 * 6. ERROR HANDLING
 *    - Use proper error handling to avoid hook failures
 *    - Implement fallback mechanisms
 */

import { cache } from "../config/cache.js";
import { QueryMonitor } from "./queryOptimizer.js";

/**
 * Optimized hook utilities
 */
export class HookOptimizer {
  /**
   * Create optimized pre-save hook
   */
  static createOptimizedPreSave(schema, options = {}) {
    const {
      trackModifications = true,
      updateTimestamps = true,
      validateRelations = false,
      indexFields = [],
    } = options;

    schema.pre("save", async function (next) {
      const doc = this;
      const startTime = Date.now();

      try {
        // Track which fields were modified (for selective operations)
        if (trackModifications && doc.isNew) {
          doc._wasNew = true;
        }

        // Update timestamps efficiently
        if (updateTimestamps) {
          if (doc.isNew) {
            doc.createdAt = doc.updatedAt = new Date();
          } else if (doc.isModified()) {
            doc.updatedAt = new Date();
          }
        }

        // Validate relations only if related fields were modified
        if (validateRelations && doc.isModified()) {
          const modifiedPaths = doc.modifiedPaths();
          const relationFields = ["user", "service", "booking"]; // Adjust as needed

          const hasRelationChanges = relationFields.some((field) =>
            modifiedPaths.includes(field)
          );

          if (hasRelationChanges) {
            await this.validateRelations(doc, modifiedPaths);
          }
        }

        // Index field processing
        if (indexFields.length > 0) {
          await this.processIndexFields(doc, indexFields);
        }

        const duration = Date.now() - startTime;
        QueryMonitor.logQuery(
          "PRE_SAVE",
          doc.constructor.modelName,
          {},
          duration,
          false
        );

        next();
      } catch (error) {
        console.error(
          `Pre-save hook error for ${doc.constructor.modelName}:`,
          error.message
        );
        next(error);
      }
    });
  }

  /**
   * Create optimized post-save hook
   */
  static createOptimizedPostSave(schema, options = {}) {
    const {
      invalidateCache = true,
      sendNotifications = false,
      updateRelated = false,
      trackAnalytics = false,
    } = options;

    schema.post("save", async function (doc, next) {
      const startTime = Date.now();

      try {
        // Use Promise.all for parallel operations
        const operations = [];

        // Cache invalidation (most critical)
        if (invalidateCache) {
          operations.push(HookOptimizer.invalidateRelatedCaches(doc));
        }

        // Notifications (if needed)
        if (sendNotifications && (doc._wasNew || doc.isModified())) {
          operations.push(HookOptimizer.sendNotificationsAsync(doc));
        }

        // Update related documents (be careful with this)
        if (updateRelated) {
          operations.push(HookOptimizer.updateRelatedDocuments(doc));
        }

        // Analytics tracking (non-blocking)
        if (trackAnalytics) {
          // Don't await this - let it run in background
          HookOptimizer.trackAnalytics(doc).catch(console.error);
        }

        // Execute all operations in parallel
        if (operations.length > 0) {
          await Promise.all(operations);
        }

        const duration = Date.now() - startTime;
        QueryMonitor.logQuery(
          "POST_SAVE",
          doc.constructor.modelName,
          {},
          duration,
          false
        );

        next();
      } catch (error) {
        console.error(
          `Post-save hook error for ${doc.constructor.modelName}:`,
          error.message
        );
        // Don't fail the save operation for post-hook errors
        next();
      }
    });
  }

  /**
   * Create optimized pre-remove hook
   */
  static createOptimizedPreRemove(schema, options = {}) {
    const {
      softDelete = false,
      cascadeDelete = false,
      backupData = false,
    } = options;

    schema.pre("remove", async function (next) {
      const doc = this;
      const startTime = Date.now();

      try {
        // Soft delete implementation
        if (softDelete) {
          doc.isDeleted = true;
          doc.deletedAt = new Date();
          return next(); // Skip actual deletion
        }

        // Backup data before deletion (if needed)
        if (backupData) {
          await HookOptimizer.backupDocument(doc);
        }

        // Cascade delete related documents
        if (cascadeDelete) {
          await HookOptimizer.cascadeDeleteRelated(doc);
        }

        const duration = Date.now() - startTime;
        QueryMonitor.logQuery(
          "PRE_REMOVE",
          doc.constructor.modelName,
          {},
          duration,
          false
        );

        next();
      } catch (error) {
        console.error(
          `Pre-remove hook error for ${doc.constructor.modelName}:`,
          error.message
        );
        next(error);
      }
    });
  }

  /**
   * Create optimized post-remove hook
   */
  static createOptimizedPostRemove(schema, options = {}) {
    const {
      invalidateCache = true,
      logDeletion = true,
      cleanupFiles = false,
    } = options;

    schema.post("remove", async function (doc, next) {
      const startTime = Date.now();

      try {
        const operations = [];

        // Cache invalidation
        if (invalidateCache) {
          operations.push(HookOptimizer.invalidateRelatedCaches(doc));
        }

        // Log deletion for audit trail
        if (logDeletion) {
          operations.push(HookOptimizer.logDeletion(doc));
        }

        // Cleanup associated files (images, documents, etc.)
        if (cleanupFiles) {
          operations.push(HookOptimizer.cleanupAssociatedFiles(doc));
        }

        await Promise.all(operations);

        const duration = Date.now() - startTime;
        QueryMonitor.logQuery(
          "POST_REMOVE",
          doc.constructor.modelName,
          {},
          duration,
          false
        );

        next();
      } catch (error) {
        console.error(
          `Post-remove hook error for ${doc.constructor.modelName}:`,
          error.message
        );
        next();
      }
    });
  }

  /**
   * Optimized cache invalidation
   */
  static async invalidateRelatedCaches(doc) {
    const modelName = doc.constructor.modelName.toLowerCase();
    const patterns = [
      `${modelName}:*`,
      `list:${modelName}:*`,
      `paginate:*${modelName}*`,
      `related:*${modelName}*`,
    ];

    // Add specific cache keys based on document
    if (doc._id) {
      patterns.push(`${modelName}_${doc._id}`);
    }

    // Model-specific cache patterns
    if (modelName === "service" && doc.category) {
      patterns.push(`category_${doc.category}`);
    }

    if (modelName === "user" && doc.role) {
      patterns.push(`users_${doc.role}`);
    }

    // Invalidate all patterns
    const invalidationPromises = patterns.map((pattern) =>
      cache
        .delPattern(pattern)
        .catch((err) =>
          console.error(
            `Cache invalidation failed for pattern ${pattern}:`,
            err.message
          )
        )
    );

    await Promise.all(invalidationPromises);
  }

  /**
   * Send notifications asynchronously
   */
  static async sendNotificationsAsync(doc) {
    // Implement notification logic based on document type
    const modelName = doc.constructor.modelName;

    switch (modelName) {
      case "Booking":
        if (doc.isModified("status")) {
          await this.sendBookingStatusNotification(doc);
        }
        break;

      case "User":
        if (doc._wasNew) {
          await this.sendWelcomeNotification(doc);
        }
        break;

      default:
        // Generic notification handling
        break;
    }
  }

  /**
   * Update related documents efficiently
   */
  static async updateRelatedDocuments(doc) {
    const modelName = doc.constructor.modelName;

    // Only update if specific fields changed
    if (modelName === "User" && doc.isModified("name")) {
      // Update user references in bookings
      const User = doc.constructor;
      await User.model("Booking").updateMany(
        {
          $or: [{ customer: doc._id }, { professional: doc._id }],
        },
        {
          $set: {
            updatedAt: new Date(),
          },
        }
      );
    }
  }

  /**
   * Track analytics data
   */
  static async trackAnalytics(doc) {
    // Non-blocking analytics tracking
    const modelName = doc.constructor.modelName;

    try {
      // Implement analytics tracking logic
      console.log(
        `📊 Analytics: ${modelName} ${doc._wasNew ? "created" : "updated"}`
      );
    } catch (error) {
      console.error("Analytics tracking failed:", error.message);
    }
  }

  /**
   * Backup document before deletion
   */
  static async backupDocument(doc) {
    // Implement backup logic if needed
    console.log(`💾 Backing up ${doc.constructor.modelName} ${doc._id}`);
  }

  /**
   * Cascade delete related documents
   */
  static async cascadeDeleteRelated(doc) {
    const modelName = doc.constructor.modelName;

    if (modelName === "User") {
      // Delete user's bookings, addresses, etc.
      await Promise.all([
        doc.constructor.model("Booking").deleteMany({
          $or: [{ customer: doc._id }, { professional: doc._id }],
        }),
        doc.constructor.model("Address").deleteMany({ user: doc._id }),
        doc.constructor
          .model("Notification")
          .deleteMany({ recipient: doc._id }),
      ]);
    }
  }

  /**
   * Log deletion for audit trail
   */
  static async logDeletion(doc) {
    console.log(
      `🗑️ Deleted ${doc.constructor.modelName} ${
        doc._id
      } at ${new Date().toISOString()}`
    );
  }

  /**
   * Cleanup associated files
   */
  static async cleanupAssociatedFiles(doc) {
    // Implement file cleanup logic (Cloudinary, S3, etc.)
    if (doc.profileImage || doc.image) {
      console.log(
        `🧹 Cleaning up files for ${doc.constructor.modelName} ${doc._id}`
      );
    }
  }
}

/**
 * EXAMPLE IMPLEMENTATIONS FOR COMMON MODELS
 */

/**
 * Optimized hooks for User model
 */
export const optimizeUserHooks = (userSchema) => {
  HookOptimizer.createOptimizedPreSave(userSchema, {
    trackModifications: true,
    updateTimestamps: true,
    indexFields: ["email", "phone"],
  });

  HookOptimizer.createOptimizedPostSave(userSchema, {
    invalidateCache: true,
    sendNotifications: true,
    trackAnalytics: true,
  });

  HookOptimizer.createOptimizedPreRemove(userSchema, {
    softDelete: true, // Usually better to soft delete users
    backupData: true,
  });

  // Custom user-specific hooks
  userSchema.pre("save", function (next) {
    // Ensure phone number format
    if (this.isModified("phone") && this.phone && !this.phone.startsWith("+")) {
      this.phone = `+91${this.phone}`; // Default to India
    }
    next();
  });
};

/**
 * Optimized hooks for Booking model
 */
export const optimizeBookingHooks = (bookingSchema) => {
  HookOptimizer.createOptimizedPreSave(bookingSchema, {
    trackModifications: true,
    updateTimestamps: true,
    validateRelations: true,
  });

  HookOptimizer.createOptimizedPostSave(bookingSchema, {
    invalidateCache: true,
    sendNotifications: true,
    updateRelated: false, // Be careful with this for bookings
    trackAnalytics: true,
  });

  // Custom booking-specific hooks
  bookingSchema.pre("save", function (next) {
    // Auto-calculate total amount if not set
    if (this.isNew && !this.totalAmount && this.price) {
      this.totalAmount = this.price;
    }
    next();
  });
};

/**
 * Optimized hooks for Service model
 */
export const optimizeServiceHooks = (serviceSchema) => {
  HookOptimizer.createOptimizedPreSave(serviceSchema, {
    trackModifications: true,
    updateTimestamps: true,
  });

  HookOptimizer.createOptimizedPostSave(serviceSchema, {
    invalidateCache: true,
    sendNotifications: false,
    trackAnalytics: true,
  });

  // Custom service-specific hooks
  serviceSchema.pre("save", function (next) {
    // Auto-generate slug from title
    if (this.isModified("title")) {
      this.slug = this.title.toLowerCase().replace(/\s+/g, "-");
    }
    next();
  });
};

export default {
  HookOptimizer,
  optimizeUserHooks,
  optimizeBookingHooks,
  optimizeServiceHooks,
};
