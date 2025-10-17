/**
 * Aggregation Pipeline Optimization Utilities for DashStream Backend
 * Provides optimized aggregation queries with caching and performance monitoring
 */

import { cache, CACHE_TTL, CACHE_KEYS } from "../config/cache.js";
import { QueryMonitor } from "./queryOptimizer.js";

/**
 * Common aggregation pipelines for DashStream
 */
export const AGGREGATION_PIPELINES = {
  // User Analytics
  USER_STATS: [
    {
      $group: {
        _id: "$role",
        count: { $sum: 1 },
        activeUsers: {
          $sum: {
            $cond: [
              {
                $gte: [
                  "$lastActive",
                  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                ],
              },
              1,
              0,
            ],
          },
        },
        avgRating: { $avg: "$totalRatings" },
      },
    },
    {
      $sort: { count: -1 },
    },
  ],

  // Booking Analytics
  BOOKING_STATS: [
    {
      $group: {
        _id: {
          status: "$status",
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        count: { $sum: 1 },
        totalRevenue: { $sum: "$totalAmount" },
        avgAmount: { $avg: "$totalAmount" },
      },
    },
    {
      $sort: { "_id.year": -1, "_id.month": -1 },
    },
  ],

  // Service Performance
  SERVICE_PERFORMANCE: [
    {
      $lookup: {
        from: "bookings",
        localField: "_id",
        foreignField: "service",
        as: "bookings",
      },
    },
    {
      $addFields: {
        bookingCount: { $size: "$bookings" },
        totalRevenue: {
          $sum: {
            $map: {
              input: "$bookings",
              as: "booking",
              in: "$$booking.totalAmount",
            },
          },
        },
      },
    },
    {
      $project: {
        title: 1,
        category: 1,
        price: 1,
        rating: 1,
        bookingCount: 1,
        totalRevenue: 1,
        popularityScore: {
          $add: [
            { $multiply: ["$bookingCount", 0.6] },
            { $multiply: ["$rating", 0.4] },
          ],
        },
      },
    },
    {
      $sort: { popularityScore: -1 },
    },
  ],

  // Professional Performance
  PROFESSIONAL_PERFORMANCE: [
    {
      $match: { role: "professional" },
    },
    {
      $lookup: {
        from: "bookings",
        localField: "_id",
        foreignField: "professional",
        as: "bookings",
      },
    },
    {
      $addFields: {
        totalBookings: { $size: "$bookings" },
        completedBookings: {
          $size: {
            $filter: {
              input: "$bookings",
              as: "booking",
              cond: { $eq: ["$$booking.status", "completed"] },
            },
          },
        },
        totalEarnings: {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: "$bookings",
                  as: "booking",
                  cond: { $eq: ["$$booking.status", "completed"] },
                },
              },
              as: "booking",
              in: "$$booking.totalAmount",
            },
          },
        },
      },
    },
    {
      $addFields: {
        completionRate: {
          $cond: [
            { $eq: ["$totalBookings", 0] },
            0,
            { $divide: ["$completedBookings", "$totalBookings"] },
          ],
        },
      },
    },
    {
      $project: {
        name: 1,
        phone: 1,
        totalRatings: 1,
        totalBookings: 1,
        completedBookings: 1,
        completionRate: 1,
        totalEarnings: 1,
        isAvailable: 1,
        status: 1,
      },
    },
    {
      $sort: { totalEarnings: -1 },
    },
  ],

  // Revenue Analytics
  REVENUE_ANALYTICS: [
    {
      $match: {
        paymentStatus: "completed",
        createdAt: {
          $gte: new Date(new Date().getFullYear(), 0, 1), // Current year
        },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
        },
        dailyRevenue: { $sum: "$totalAmount" },
        bookingCount: { $sum: 1 },
        avgBookingValue: { $avg: "$totalAmount" },
      },
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 },
    },
  ],

  // Customer Insights
  CUSTOMER_INSIGHTS: [
    {
      $match: { role: "customer" },
    },
    {
      $lookup: {
        from: "bookings",
        localField: "_id",
        foreignField: "customer",
        as: "bookings",
      },
    },
    {
      $addFields: {
        totalBookings: { $size: "$bookings" },
        totalSpent: {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: "$bookings",
                  as: "booking",
                  cond: { $eq: ["$$booking.paymentStatus", "completed"] },
                },
              },
              as: "booking",
              in: "$$booking.totalAmount",
            },
          },
        },
      },
    },
    {
      $addFields: {
        avgSpendPerBooking: {
          $cond: [
            { $eq: ["$totalBookings", 0] },
            0,
            { $divide: ["$totalSpent", "$totalBookings"] },
          ],
        },
        customerSegment: {
          $switch: {
            branches: [
              { case: { $gte: ["$totalSpent", 10000] }, then: "Premium" },
              { case: { $gte: ["$totalSpent", 5000] }, then: "Regular" },
              { case: { $gte: ["$totalSpent", 1000] }, then: "Occasional" },
            ],
            default: "New",
          },
        },
      },
    },
    {
      $project: {
        name: 1,
        phone: 1,
        totalBookings: 1,
        totalSpent: 1,
        avgSpendPerBooking: 1,
        customerSegment: 1,
        lastActive: 1,
      },
    },
  ],
};

/**
 * Aggregation Pipeline Builder with Optimization
 */
export class AggregationOptimizer {
  constructor(model, modelName) {
    this.model = model;
    this.modelName = modelName;
  }

  /**
   * Execute optimized aggregation with caching
   */
  async aggregate(pipeline, options = {}) {
    const {
      cache: enableCache = true,
      cacheTTL = CACHE_TTL.MEDIUM,
      cacheKey = null,
      allowDiskUse = true,
      cursor = {},
      explain = false,
    } = options;

    // Generate cache key
    let fullCacheKey = null;
    if (enableCache && cacheKey) {
      fullCacheKey = `${this.modelName.toLowerCase()}:agg:${cacheKey}:${JSON.stringify(
        pipeline
      )}`;

      const cached = await cache.get(fullCacheKey);
      if (cached) {
        QueryMonitor.logQuery("AGGREGATE", this.modelName, "cached", 0, true);
        return cached;
      }
    }

    const startTime = Date.now();

    try {
      // Build aggregation with optimization options
      let aggregation = this.model.aggregate(pipeline);

      if (allowDiskUse) {
        aggregation = aggregation.allowDiskUse(true);
      }

      if (Object.keys(cursor).length > 0) {
        aggregation = aggregation.cursor(cursor);
      }

      if (explain) {
        const explanation = await aggregation.explain();
        console.log(
          "📊 Aggregation Explanation:",
          JSON.stringify(explanation, null, 2)
        );
        return explanation;
      }

      const result = await aggregation.exec();
      const duration = Date.now() - startTime;

      // Cache result if enabled
      if (enableCache && fullCacheKey && result) {
        await cache.set(fullCacheKey, result, cacheTTL);
      }

      QueryMonitor.logQuery(
        "AGGREGATE",
        this.modelName,
        pipeline[0],
        duration,
        false
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(
        `❌ Aggregation failed for ${this.modelName}:`,
        error.message
      );
      QueryMonitor.logQuery(
        "AGGREGATE_ERROR",
        this.modelName,
        pipeline[0],
        duration,
        false
      );
      throw error;
    }
  }

  /**
   * Get aggregation with faceted results (multiple aggregations in one query)
   */
  async facetAggregate(facets, options = {}) {
    const {
      cache: enableCache = true,
      cacheTTL = CACHE_TTL.MEDIUM,
      cacheKey = null,
    } = options;

    let fullCacheKey = null;
    if (enableCache && cacheKey) {
      fullCacheKey = `${this.modelName.toLowerCase()}:facet:${cacheKey}:${JSON.stringify(
        facets
      )}`;

      const cached = await cache.get(fullCacheKey);
      if (cached) {
        return cached;
      }
    }

    const pipeline = [{ $facet: facets }];

    const result = await this.aggregate(pipeline, {
      cache: false, // Don't double-cache
      ...options,
    });

    if (enableCache && fullCacheKey && result) {
      await cache.set(fullCacheKey, result, cacheTTL);
    }

    return result[0]; // $facet returns array, we want the object
  }

  /**
   * Get predefined pipeline results
   */
  async getPredefinedPipeline(pipelineName, options = {}) {
    const pipeline = AGGREGATION_PIPELINES[pipelineName];
    if (!pipeline) {
      throw new Error(`Pipeline ${pipelineName} not found`);
    }

    return this.aggregate(pipeline, {
      cacheKey: pipelineName.toLowerCase(),
      ...options,
    });
  }

  /**
   * Get paginated aggregation results
   */
  async aggregatePaginated(pipeline, page = 1, limit = 20, options = {}) {
    const skip = (page - 1) * limit;

    const facets = {
      data: [...pipeline, { $skip: skip }, { $limit: limit }],
      totalCount: [...pipeline, { $count: "count" }],
    };

    const result = await this.facetAggregate(facets, {
      cacheKey: `paginate:p${page}:l${limit}`,
      ...options,
    });

    const totalDocs = result.totalCount[0]?.count || 0;
    const totalPages = Math.ceil(totalDocs / limit);

    return {
      docs: result.data,
      totalDocs,
      limit,
      page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
    };
  }

  /**
   * Optimize pipeline by adding $match stages early
   */
  static optimizePipeline(pipeline, matchConditions = {}) {
    const optimized = [...pipeline];

    // Add $match stage at beginning if conditions provided
    if (Object.keys(matchConditions).length > 0) {
      optimized.unshift({ $match: matchConditions });
    }

    // Look for $sort stages and add index hints
    return optimized.map((stage) => {
      if (stage.$sort && Object.keys(stage.$sort).length === 1) {
        const sortField = Object.keys(stage.$sort)[0];
        return {
          ...stage,
          $hint: { [sortField]: stage.$sort[sortField] },
        };
      }
      return stage;
    });
  }

  /**
   * Invalidate aggregation cache
   */
  async invalidateCache(pattern = "*") {
    const cachePattern = `${this.modelName.toLowerCase()}:agg:${pattern}`;
    return await cache.delPattern(cachePattern);
  }
}

/**
 * Dashboard Analytics Helper
 */
export class DashboardAnalytics {
  constructor() {
    this.userAggregator = null;
    this.bookingAggregator = null;
    this.serviceAggregator = null;
  }

  initialize(models) {
    this.userAggregator = new AggregationOptimizer(models.User, "User");
    this.bookingAggregator = new AggregationOptimizer(
      models.Booking,
      "Booking"
    );
    this.serviceAggregator = new AggregationOptimizer(
      models.Service,
      "Service"
    );
  }

  /**
   * Get comprehensive dashboard data
   */
  async getDashboardData(dateRange = {}) {
    const { startDate, endDate } = dateRange;

    // Add date filters to pipelines if provided
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const promises = [
      this.userAggregator.getPredefinedPipeline("USER_STATS", {
        cacheKey: "dashboard_users",
        cacheTTL: CACHE_TTL.LONG,
      }),

      this.bookingAggregator.aggregate(
        AggregationOptimizer.optimizePipeline(
          AGGREGATION_PIPELINES.BOOKING_STATS,
          dateFilter
        ),
        {
          cacheKey: `dashboard_bookings_${JSON.stringify(dateRange)}`,
          cacheTTL: CACHE_TTL.MEDIUM,
        }
      ),

      this.serviceAggregator.getPredefinedPipeline("SERVICE_PERFORMANCE", {
        cacheKey: "dashboard_services",
        cacheTTL: CACHE_TTL.LONG,
      }),

      this.bookingAggregator.aggregate(
        AggregationOptimizer.optimizePipeline(
          AGGREGATION_PIPELINES.REVENUE_ANALYTICS,
          dateFilter
        ),
        {
          cacheKey: `dashboard_revenue_${JSON.stringify(dateRange)}`,
          cacheTTL: CACHE_TTL.MEDIUM,
        }
      ),
    ];

    const [userStats, bookingStats, servicePerformance, revenueData] =
      await Promise.all(promises);

    return {
      userStats,
      bookingStats,
      servicePerformance: servicePerformance.slice(0, 10), // Top 10 services
      revenueData,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get real-time metrics
   */
  async getRealTimeMetrics() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const metrics = await this.bookingAggregator.facetAggregate(
      {
        todayBookings: [
          { $match: { createdAt: { $gte: today } } },
          { $count: "count" },
        ],
        weeklyBookings: [
          { $match: { createdAt: { $gte: thisWeek } } },
          { $count: "count" },
        ],
        todayRevenue: [
          {
            $match: {
              createdAt: { $gte: today },
              paymentStatus: "completed",
            },
          },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ],
        activeBookings: [
          {
            $match: {
              status: { $in: ["confirmed", "in-progress"] },
            },
          },
          { $count: "count" },
        ],
      },
      {
        cacheKey: "realtime_metrics",
        cacheTTL: CACHE_TTL.SHORT,
      }
    );

    return {
      todayBookings: metrics.todayBookings[0]?.count || 0,
      weeklyBookings: metrics.weeklyBookings[0]?.count || 0,
      todayRevenue: metrics.todayRevenue[0]?.total || 0,
      activeBookings: metrics.activeBookings[0]?.count || 0,
      timestamp: new Date().toISOString(),
    };
  }
}

export default {
  AggregationOptimizer,
  DashboardAnalytics,
  AGGREGATION_PIPELINES,
};
