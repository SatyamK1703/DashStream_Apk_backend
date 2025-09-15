/**
 * Batch Operations Utilities for DashStream Backend
 * Provides optimized bulk database operations for better performance
 */

import { cache, CACHE_TTL } from "../config/cache.js";
import { QueryMonitor } from "./queryOptimizer.js";

/**
 * Batch Operation Manager
 */
export class BatchOperationManager {
  constructor(model, modelName) {
    this.model = model;
    this.modelName = modelName;
    this.batchSize = process.env.BATCH_SIZE || 1000;
  }

  /**
   * Bulk insert with optimizations
   */
  async bulkInsert(documents, options = {}) {
    const {
      ordered = false, // Allow parallel processing
      batchSize = this.batchSize,
      validateBeforeInsert = true,
      skipDuplicates = false,
    } = options;

    if (!Array.isArray(documents) || documents.length === 0) {
      throw new Error("Documents array is required and cannot be empty");
    }

    console.log(
      `🚀 Starting bulk insert of ${documents.length} documents for ${this.modelName}`
    );
    const startTime = Date.now();

    try {
      const results = [];
      const errors = [];

      // Process in batches
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        console.log(
          `📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
            documents.length / batchSize
          )}`
        );

        try {
          // Validate documents if required
          if (validateBeforeInsert) {
            batch.forEach((doc, index) => {
              if (!doc || typeof doc !== "object") {
                throw new Error(`Invalid document at index ${i + index}`);
              }
            });
          }

          const batchResult = await this.model.insertMany(batch, {
            ordered,
            rawResult: true,
            writeConcern: {
              w: "majority",
              j: true,
              wtimeout: 10000,
            },
          });

          results.push({
            batchIndex: Math.floor(i / batchSize),
            insertedCount: batchResult.insertedCount,
            insertedIds: batchResult.insertedIds,
          });
        } catch (error) {
          console.error(
            `❌ Batch ${Math.floor(i / batchSize) + 1} failed:`,
            error.message
          );

          if (skipDuplicates && error.code === 11000) {
            // Handle duplicate key errors
            console.log(
              `⚠️ Skipping duplicates in batch ${Math.floor(i / batchSize) + 1}`
            );
            continue;
          }

          errors.push({
            batchIndex: Math.floor(i / batchSize),
            error: error.message,
            documents: batch,
          });

          if (ordered) {
            throw error; // Stop on first error if ordered
          }
        }
      }

      const duration = Date.now() - startTime;
      const totalInserted = results.reduce(
        (sum, r) => sum + r.insertedCount,
        0
      );

      console.log(
        `✅ Bulk insert completed: ${totalInserted}/${documents.length} documents in ${duration}ms`
      );

      QueryMonitor.logQuery(
        "BULK_INSERT",
        this.modelName,
        { count: documents.length },
        duration,
        false
      );

      return {
        success: true,
        totalDocuments: documents.length,
        insertedDocuments: totalInserted,
        failedBatches: errors.length,
        duration,
        results,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(
        `❌ Bulk insert failed for ${this.modelName}:`,
        error.message
      );

      QueryMonitor.logQuery(
        "BULK_INSERT_ERROR",
        this.modelName,
        { count: documents.length },
        duration,
        false
      );

      throw new Error(`Bulk insert failed: ${error.message}`);
    }
  }

  /**
   * Bulk update with optimizations
   */
  async bulkUpdate(updates, options = {}) {
    const {
      ordered = false,
      batchSize = this.batchSize,
      upsert = false,
    } = options;

    if (!Array.isArray(updates) || updates.length === 0) {
      throw new Error("Updates array is required and cannot be empty");
    }

    console.log(
      `🔄 Starting bulk update of ${updates.length} operations for ${this.modelName}`
    );
    const startTime = Date.now();

    try {
      const bulkOps = updates.map((update) => {
        const { filter, updateDoc, options: updateOptions = {} } = update;

        return {
          updateMany: {
            filter,
            update: updateDoc,
            upsert: upsert || updateOptions.upsert || false,
            arrayFilters: updateOptions.arrayFilters,
          },
        };
      });

      const results = [];

      // Process in batches
      for (let i = 0; i < bulkOps.length; i += batchSize) {
        const batch = bulkOps.slice(i, i + batchSize);

        const result = await this.model.bulkWrite(batch, {
          ordered,
          writeConcern: {
            w: "majority",
            j: true,
            wtimeout: 10000,
          },
        });

        results.push(result);
      }

      const duration = Date.now() - startTime;
      const totalModified = results.reduce(
        (sum, r) => sum + r.modifiedCount,
        0
      );
      const totalMatched = results.reduce((sum, r) => sum + r.matchedCount, 0);

      console.log(
        `✅ Bulk update completed: ${totalModified}/${totalMatched} documents modified in ${duration}ms`
      );

      QueryMonitor.logQuery(
        "BULK_UPDATE",
        this.modelName,
        { count: updates.length },
        duration,
        false
      );

      return {
        success: true,
        matchedCount: totalMatched,
        modifiedCount: totalModified,
        upsertedCount: results.reduce((sum, r) => sum + r.upsertedCount, 0),
        duration,
        results,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(
        `❌ Bulk update failed for ${this.modelName}:`,
        error.message
      );

      QueryMonitor.logQuery(
        "BULK_UPDATE_ERROR",
        this.modelName,
        { count: updates.length },
        duration,
        false
      );

      throw new Error(`Bulk update failed: ${error.message}`);
    }
  }

  /**
   * Bulk delete with optimizations
   */
  async bulkDelete(filters, options = {}) {
    const {
      ordered = false,
      batchSize = this.batchSize,
      softDelete = false,
      softDeleteField = "isDeleted",
    } = options;

    if (!Array.isArray(filters) || filters.length === 0) {
      throw new Error("Filters array is required and cannot be empty");
    }

    console.log(
      `🗑️ Starting bulk delete of ${filters.length} operations for ${this.modelName}`
    );
    const startTime = Date.now();

    try {
      let bulkOps;

      if (softDelete) {
        // Soft delete - update documents to mark as deleted
        bulkOps = filters.map((filter) => ({
          updateMany: {
            filter,
            update: {
              $set: {
                [softDeleteField]: true,
                deletedAt: new Date(),
              },
            },
          },
        }));
      } else {
        // Hard delete - actually remove documents
        bulkOps = filters.map((filter) => ({
          deleteMany: { filter },
        }));
      }

      const results = [];

      // Process in batches
      for (let i = 0; i < bulkOps.length; i += batchSize) {
        const batch = bulkOps.slice(i, i + batchSize);

        const result = await this.model.bulkWrite(batch, {
          ordered,
          writeConcern: {
            w: "majority",
            j: true,
            wtimeout: 10000,
          },
        });

        results.push(result);
      }

      const duration = Date.now() - startTime;
      const totalDeleted = softDelete
        ? results.reduce((sum, r) => sum + r.modifiedCount, 0)
        : results.reduce((sum, r) => sum + r.deletedCount, 0);

      console.log(
        `✅ Bulk delete completed: ${totalDeleted} documents ${
          softDelete ? "marked as deleted" : "deleted"
        } in ${duration}ms`
      );

      QueryMonitor.logQuery(
        "BULK_DELETE",
        this.modelName,
        { count: filters.length },
        duration,
        false
      );

      return {
        success: true,
        deletedCount: totalDeleted,
        softDelete,
        duration,
        results,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(
        `❌ Bulk delete failed for ${this.modelName}:`,
        error.message
      );

      QueryMonitor.logQuery(
        "BULK_DELETE_ERROR",
        this.modelName,
        { count: filters.length },
        duration,
        false
      );

      throw new Error(`Bulk delete failed: ${error.message}`);
    }
  }

  /**
   * Bulk upsert (insert or update)
   */
  async bulkUpsert(documents, keyField = "_id", options = {}) {
    const { batchSize = this.batchSize, ordered = false } = options;

    console.log(
      `⚡ Starting bulk upsert of ${documents.length} documents for ${this.modelName}`
    );
    const startTime = Date.now();

    try {
      const bulkOps = documents.map((doc) => ({
        replaceOne: {
          filter: { [keyField]: doc[keyField] },
          replacement: doc,
          upsert: true,
        },
      }));

      const results = [];

      // Process in batches
      for (let i = 0; i < bulkOps.length; i += batchSize) {
        const batch = bulkOps.slice(i, i + batchSize);

        const result = await this.model.bulkWrite(batch, {
          ordered,
          writeConcern: {
            w: "majority",
            j: true,
            wtimeout: 10000,
          },
        });

        results.push(result);
      }

      const duration = Date.now() - startTime;
      const totalUpserted = results.reduce(
        (sum, r) => sum + r.upsertedCount,
        0
      );
      const totalModified = results.reduce(
        (sum, r) => sum + r.modifiedCount,
        0
      );

      console.log(
        `✅ Bulk upsert completed: ${totalUpserted} inserted, ${totalModified} modified in ${duration}ms`
      );

      QueryMonitor.logQuery(
        "BULK_UPSERT",
        this.modelName,
        { count: documents.length },
        duration,
        false
      );

      return {
        success: true,
        upsertedCount: totalUpserted,
        modifiedCount: totalModified,
        matchedCount: results.reduce((sum, r) => sum + r.matchedCount, 0),
        duration,
        results,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(
        `❌ Bulk upsert failed for ${this.modelName}:`,
        error.message
      );

      QueryMonitor.logQuery(
        "BULK_UPSERT_ERROR",
        this.modelName,
        { count: documents.length },
        duration,
        false
      );

      throw new Error(`Bulk upsert failed: ${error.message}`);
    }
  }

  /**
   * Process large dataset with cursor and batch processing
   */
  async processLargeDataset(filter, processor, options = {}) {
    const {
      batchSize = this.batchSize,
      projection = null,
      sort = null,
      parallel = false,
      maxConcurrency = 5,
    } = options;

    console.log(`🔄 Processing large dataset for ${this.modelName}...`);
    const startTime = Date.now();

    try {
      let query = this.model.find(filter);

      if (projection) query = query.select(projection);
      if (sort) query = query.sort(sort);

      const cursor = query.cursor({ batchSize });
      const batches = [];
      let batch = [];
      let totalProcessed = 0;

      // Collect documents into batches
      for (
        let doc = await cursor.next();
        doc != null;
        doc = await cursor.next()
      ) {
        batch.push(doc);

        if (batch.length >= batchSize) {
          batches.push([...batch]);
          batch = [];
        }
      }

      // Add remaining documents
      if (batch.length > 0) {
        batches.push(batch);
      }

      console.log(`📦 Created ${batches.length} batches for processing`);

      if (parallel && batches.length > 1) {
        // Process batches in parallel with concurrency limit
        const semaphore = new Semaphore(maxConcurrency);

        const batchPromises = batches.map(async (batchDocs, index) => {
          await semaphore.acquire();
          try {
            console.log(`🔄 Processing batch ${index + 1}/${batches.length}`);
            const result = await processor(batchDocs);
            totalProcessed += batchDocs.length;
            return result;
          } finally {
            semaphore.release();
          }
        });

        await Promise.all(batchPromises);
      } else {
        // Process batches sequentially
        for (let i = 0; i < batches.length; i++) {
          console.log(`🔄 Processing batch ${i + 1}/${batches.length}`);
          await processor(batches[i]);
          totalProcessed += batches[i].length;
        }
      }

      const duration = Date.now() - startTime;
      console.log(
        `✅ Large dataset processing completed: ${totalProcessed} documents in ${duration}ms`
      );

      QueryMonitor.logQuery(
        "BATCH_PROCESS",
        this.modelName,
        filter,
        duration,
        false
      );

      return {
        success: true,
        processedCount: totalProcessed,
        batchCount: batches.length,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(
        `❌ Large dataset processing failed for ${this.modelName}:`,
        error.message
      );
      throw error;
    }
  }

  /**
   * Invalidate caches related to this model
   */
  async invalidateModelCache() {
    const patterns = [
      `${this.modelName.toLowerCase()}:*`,
      `paginate:*:${this.modelName.toLowerCase()}:*`,
      `count:*:${this.modelName.toLowerCase()}:*`,
    ];

    for (const pattern of patterns) {
      await cache.delPattern(pattern);
    }

    console.log(`🧹 Invalidated cache patterns for ${this.modelName}`);
  }
}

/**
 * Semaphore for controlling concurrency
 */
class Semaphore {
  constructor(max) {
    this.max = max;
    this.count = 0;
    this.waitingResolvers = [];
  }

  async acquire() {
    if (this.count < this.max) {
      this.count++;
      return;
    }

    return new Promise((resolve) => {
      this.waitingResolvers.push(resolve);
    });
  }

  release() {
    this.count--;
    if (this.waitingResolvers.length > 0) {
      this.count++;
      const resolve = this.waitingResolvers.shift();
      resolve();
    }
  }
}

/**
 * Data Migration Helper
 */
export class DataMigrationHelper {
  constructor(sourceModel, targetModel, modelName) {
    this.sourceModel = sourceModel;
    this.targetModel = targetModel;
    this.modelName = modelName;
    this.batchManager = new BatchOperationManager(targetModel, modelName);
  }

  /**
   * Migrate data from source to target with transformation
   */
  async migrateData(transformFn, options = {}) {
    const {
      batchSize = 1000,
      dryRun = false,
      skipExisting = true,
      filter = {},
    } = options;

    console.log(`🚀 Starting data migration for ${this.modelName}...`);

    if (dryRun) {
      console.log("🧪 DRY RUN MODE - No data will be modified");
    }

    const totalCount = await this.sourceModel.countDocuments(filter);
    console.log(`📊 Total documents to migrate: ${totalCount}`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    const cursor = this.sourceModel.find(filter).cursor({ batchSize });
    let batch = [];

    for (
      let doc = await cursor.next();
      doc != null;
      doc = await cursor.next()
    ) {
      try {
        // Transform document
        const transformedDoc = await transformFn(doc.toObject());

        if (transformedDoc) {
          batch.push(transformedDoc);
        } else {
          skippedCount++;
        }

        // Process batch when full
        if (batch.length >= batchSize) {
          if (!dryRun) {
            const result = await this.batchManager.bulkUpsert(batch, "_id", {
              skipDuplicates: skipExisting,
            });
            migratedCount += result.upsertedCount + result.modifiedCount;
          } else {
            migratedCount += batch.length;
          }

          batch = [];
          console.log(`✅ Migrated ${migratedCount}/${totalCount} documents`);
        }
      } catch (error) {
        console.error(
          `❌ Error transforming document ${doc._id}:`,
          error.message
        );
        errorCount++;
      }
    }

    // Process remaining batch
    if (batch.length > 0) {
      if (!dryRun) {
        const result = await this.batchManager.bulkUpsert(batch, "_id", {
          skipDuplicates: skipExisting,
        });
        migratedCount += result.upsertedCount + result.modifiedCount;
      } else {
        migratedCount += batch.length;
      }
    }

    console.log(`✅ Migration completed:
      - Total: ${totalCount}
      - Migrated: ${migratedCount}
      - Skipped: ${skippedCount}
      - Errors: ${errorCount}`);

    return {
      total: totalCount,
      migrated: migratedCount,
      skipped: skippedCount,
      errors: errorCount,
      success: errorCount === 0,
    };
  }
}

export default {
  BatchOperationManager,
  DataMigrationHelper,
};
