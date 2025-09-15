/**
 * Query Optimization Utilities for DashStream Backend
 * Provides optimized query methods with caching and projections
 */
import { cache, CACHE_TTL, CACHE_KEYS } from "../config/cache.js";

/**
 * Common field projections for different models
 */
export const PROJECTIONS = {
  USER: {
    // Basic user info (for lists, references)
    BASIC: "name phone email role profileImage",
    // Profile view (for own profile)
    PROFILE:
      "name phone email role profileImage addresses profileComplete isPhoneVerified lastActive",
    // Professional info (for bookings, assignments)
    PROFESSIONAL:
      "name phone email role profileImage isAvailable status totalRatings reviews",
    // Admin view (comprehensive)
    ADMIN: "-otp -otpExpires",
    // Public info (for reviews, public profiles)
    PUBLIC: "name profileImage totalRatings reviews role",
  },

  BOOKING: {
    // List view (for booking lists)
    LIST: "customer professional service scheduledDate scheduledTime status price paymentStatus totalAmount",
    // Detail view (for single booking)
    DETAIL: "-trackingUpdates.updatedBy",
    // Professional view
    PROFESSIONAL:
      "customer service vehicle scheduledDate scheduledTime location status price notes rating estimatedDuration",
    // Customer view
    CUSTOMER:
      "professional service vehicle scheduledDate scheduledTime location status price paymentStatus paymentMethod rating totalAmount estimatedDuration",
  },

  SERVICE: {
    // List view (for service catalog)
    LIST: "title description category price discountPrice duration image vehicleType isPopular rating numReviews",
    // Detail view (for single service)
    DETAIL: "-createdBy -createdAt -updatedAt",
    // Cart/booking view
    BOOKING:
      "title description price discountPrice duration estimatedTime vehicleType",
  },

  PAYMENT: {
    // User payment history
    HISTORY:
      "bookingId amount currency status paymentMethod receiptId createdAt",
    // Detail view
    DETAIL: "-webhookEvents -razorpaySignature",
    // Admin view
    ADMIN: "",
  },

  NOTIFICATION: {
    // List view
    LIST: "title message type read readAt createdAt actionType",
    // Detail view
    DETAIL: "-recipient",
  },
};

/**
 * Optimized Query Builder
 */
export class QueryOptimizer {
  constructor(model, modelName) {
    this.model = model;
    this.modelName = modelName;
  }

  /**
   * Find documents with caching and projection
   */
  async findOptimized(filter = {}, options = {}) {
    const {
      projection = null,
      sort = null,
      limit = null,
      skip = null,
      populate = null,
      cache: enableCache = true,
      cacheTTL = CACHE_TTL.MEDIUM,
      cacheKey = null,
      lean = true,
    } = options;

    // Generate cache key if caching is enabled
    let fullCacheKey = null;
    if (enableCache && cacheKey) {
      fullCacheKey = `${this.modelName.toLowerCase()}:${cacheKey}:${JSON.stringify(
        { filter, projection, sort, limit, skip }
      )}`;

      // Try to get from cache first
      const cached = await cache.get(fullCacheKey);
      if (cached) {
        return cached;
      }
    }

    // Build query
    let query = this.model.find(filter);

    if (projection) query = query.select(projection);
    if (sort) query = query.sort(sort);
    if (limit) query = query.limit(limit);
    if (skip) query = query.skip(skip);
    if (populate) query = query.populate(populate);
    if (lean) query = query.lean();

    // Execute query
    const result = await query.exec();

    // Cache result if caching is enabled
    if (enableCache && fullCacheKey && result) {
      await cache.set(fullCacheKey, result, cacheTTL);
    }

    return result;
  }

  /**
   * Find one document with caching and projection
   */
  async findOneOptimized(filter, options = {}) {
    const {
      projection = null,
      populate = null,
      cache: enableCache = true,
      cacheTTL = CACHE_TTL.MEDIUM,
      cacheKey = null,
      lean = true,
    } = options;

    // Generate cache key if caching is enabled
    let fullCacheKey = null;
    if (enableCache && cacheKey) {
      fullCacheKey = `${this.modelName.toLowerCase()}:single:${cacheKey}:${JSON.stringify(
        { filter, projection }
      )}`;

      // Try to get from cache first
      const cached = await cache.get(fullCacheKey);
      if (cached) {
        return cached;
      }
    }

    // Build query
    let query = this.model.findOne(filter);

    if (projection) query = query.select(projection);
    if (populate) query = query.populate(populate);
    if (lean) query = query.lean();

    // Execute query
    const result = await query.exec();

    // Cache result if caching is enabled
    if (enableCache && fullCacheKey && result) {
      await cache.set(fullCacheKey, result, cacheTTL);
    }

    return result;
  }

  /**
   * Find by ID with caching and projection
   */
  async findByIdOptimized(id, options = {}) {
    const {
      projection = null,
      populate = null,
      cache: enableCache = true,
      cacheTTL = CACHE_TTL.MEDIUM,
      lean = true,
    } = options;

    const cacheKey = `${this.modelName.toLowerCase()}:id:${id}`;

    // Try to get from cache first
    if (enableCache) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Build query
    let query = this.model.findById(id);

    if (projection) query = query.select(projection);
    if (populate) query = query.populate(populate);
    if (lean) query = query.lean();

    // Execute query
    const result = await query.exec();

    // Cache result if caching is enabled
    if (enableCache && result) {
      await cache.set(cacheKey, result, cacheTTL);
    }

    return result;
  }

  /**
   * Count documents with caching
   */
  async countOptimized(filter = {}, options = {}) {
    const {
      cache: enableCache = true,
      cacheTTL = CACHE_TTL.SHORT,
      cacheKey = null,
    } = options;

    // Generate cache key if caching is enabled
    let fullCacheKey = null;
    if (enableCache && cacheKey) {
      fullCacheKey = `${this.modelName.toLowerCase()}:count:${cacheKey}:${JSON.stringify(
        filter
      )}`;

      // Try to get from cache first
      const cached = await cache.get(fullCacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    // Execute count query
    const result = await this.model.countDocuments(filter);

    // Cache result if caching is enabled
    if (enableCache && fullCacheKey) {
      await cache.set(fullCacheKey, result, cacheTTL);
    }

    return result;
  }

  /**
   * Aggregate with caching
   */
  async aggregateOptimized(pipeline, options = {}) {
    const {
      cache: enableCache = true,
      cacheTTL = CACHE_TTL.MEDIUM,
      cacheKey = null,
    } = options;

    // Generate cache key if caching is enabled
    let fullCacheKey = null;
    if (enableCache && cacheKey) {
      fullCacheKey = `${this.modelName.toLowerCase()}:agg:${cacheKey}:${JSON.stringify(
        pipeline
      )}`;

      // Try to get from cache first
      const cached = await cache.get(fullCacheKey);
      if (cached) {
        return cached;
      }
    }

    // Execute aggregation
    const result = await this.model.aggregate(pipeline);

    // Cache result if caching is enabled
    if (enableCache && fullCacheKey && result) {
      await cache.set(fullCacheKey, result, cacheTTL);
    }

    return result;
  }

  /**
   * Invalidate cache for this model
   */
  async invalidateCache(pattern = "*") {
    const cachePattern = `${this.modelName.toLowerCase()}:${pattern}`;
    return await cache.delPattern(cachePattern);
  }
}

/**
 * Pagination Helper with optimized queries
 */
export class PaginationHelper {
  constructor(model, modelName) {
    this.optimizer = new QueryOptimizer(model, modelName);
  }

  async paginate(filter = {}, options = {}) {
    const {
      page = 1,
      limit = 10,
      sort = { createdAt: -1 },
      projection = null,
      populate = null,
      cache: enableCache = true,
      cacheTTL = CACHE_TTL.MEDIUM,
    } = options;

    const skip = (page - 1) * limit;
    const cacheKey = `paginate:p${page}:l${limit}:${JSON.stringify({
      filter,
      sort,
    })}`;

    // Get total count (cached)
    const totalPromise = this.optimizer.countOptimized(filter, {
      cache: enableCache,
      cacheTTL,
      cacheKey: `count:${JSON.stringify(filter)}`,
    });

    // Get documents (cached)
    const docsPromise = this.optimizer.findOptimized(filter, {
      projection,
      sort,
      limit,
      skip,
      populate,
      cache: enableCache,
      cacheTTL,
      cacheKey,
    });

    const [total, docs] = await Promise.all([totalPromise, docsPromise]);

    const totalPages = Math.ceil(total / limit);

    return {
      docs,
      totalDocs: total,
      limit,
      page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
    };
  }
}

/**
 * Query Performance Monitor
 */
export class QueryMonitor {
  static logQuery(operation, model, filter, duration, cached = false) {
    if (process.env.NODE_ENV === "development" && process.env.DEBUG_QUERIES) {
      const cacheStatus = cached ? "💨 CACHED" : "🔍 DB";
      console.log(
        `${cacheStatus} ${operation} on ${model}: ${duration}ms - Filter: ${JSON.stringify(
          filter
        )}`
      );
    }

    // In production, you might want to log slow queries
    if (process.env.NODE_ENV === "production" && duration > 1000 && !cached) {
      console.warn(
        `⚠️ SLOW QUERY: ${operation} on ${model} took ${duration}ms`
      );
    }
  }

  static measureQuery(fn, operation, model, filter) {
    return async (...args) => {
      const start = Date.now();
      const result = await fn(...args);
      const duration = Date.now() - start;

      this.logQuery(operation, model, filter, duration, false);

      return result;
    };
  }
}

export default { QueryOptimizer, PaginationHelper, QueryMonitor, PROJECTIONS };
