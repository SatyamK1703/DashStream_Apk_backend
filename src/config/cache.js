/**
 * Redis Cache Configuration for DashStream Backend
 * Provides caching layer for database queries and API responses
 */
import NodeCache from "node-cache";

/**
 * In-Memory Cache (Node-Cache) - Fallback when Redis is not available
 */
class InMemoryCache {
  constructor() {
    this.cache = new NodeCache({
      stdTTL: 600, // Default TTL: 10 minutes
      checkperiod: 120, // Check for expired keys every 2 minutes
      useClones: false, // Don't clone objects for better performance
      deleteOnExpire: true,
      enableLegacyCallbacks: false,
      maxKeys: 10000, // Maximum number of keys
    });

    // Statistics
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
    };

    // Setup event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.cache.on("set", (key, value) => {
      this.stats.sets++;
      if (process.env.NODE_ENV === "development" && process.env.DEBUG_CACHE) {
        console.log(`📦 Cache SET: ${key}`);
      }
    });

    this.cache.on("del", (key, value) => {
      this.stats.deletes++;
      if (process.env.NODE_ENV === "development" && process.env.DEBUG_CACHE) {
        console.log(`🗑️ Cache DEL: ${key}`);
      }
    });

    this.cache.on("expired", (key, value) => {
      if (process.env.NODE_ENV === "development" && process.env.DEBUG_CACHE) {
        console.log(`⏰ Cache EXPIRED: ${key}`);
      }
    });
  }

  async get(key) {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.stats.hits++;
      return value;
    }
    this.stats.misses++;
    return null;
  }

  async set(key, value, ttl = 600) {
    return this.cache.set(key, value, ttl);
  }

  async del(key) {
    return this.cache.del(key);
  }

  async flush() {
    this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
    return this.cache.flushAll();
  }

  async keys(pattern = "*") {
    const allKeys = this.cache.keys();
    if (pattern === "*") return allKeys;

    // Simple pattern matching (only supports * wildcard)
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    return allKeys.filter((key) => regex.test(key));
  }

  async ttl(key) {
    return this.cache.getTtl(key);
  }

  getStats() {
    const cacheStats = this.cache.getStats();
    return {
      ...this.stats,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
      keys: cacheStats.keys,
      ksize: cacheStats.ksize,
      vsize: cacheStats.vsize,
    };
  }
}

/**
 * Cache Manager - Handles both Redis and In-Memory caching
 */
class CacheManager {
  constructor() {
    this.cache = new InMemoryCache();
    this.isConnected = true;
    this.type = "memory";

    console.log("📦 Cache initialized with In-Memory storage");
  }

  /**
   * Generate cache key with prefix
   */
  generateKey(prefix, ...parts) {
    return `dashstream:${prefix}:${parts.join(":")}`;
  }

  /**
   * Get value from cache
   */
  async get(key, options = {}) {
    try {
      const fullKey =
        options.usePrefix !== false ? this.generateKey("api", key) : key;
      const value = await this.cache.get(fullKey);

      if (value) {
        return typeof value === "string" ? JSON.parse(value) : value;
      }
      return null;
    } catch (error) {
      console.error("Cache GET error:", error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key, value, ttl = 600, options = {}) {
    try {
      const fullKey =
        options.usePrefix !== false ? this.generateKey("api", key) : key;
      const serializedValue =
        typeof value === "object" ? JSON.stringify(value) : value;

      return await this.cache.set(fullKey, serializedValue, ttl);
    } catch (error) {
      console.error("Cache SET error:", error);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async del(key, options = {}) {
    try {
      const fullKey =
        options.usePrefix !== false ? this.generateKey("api", key) : key;
      return await this.cache.del(fullKey);
    } catch (error) {
      console.error("Cache DEL error:", error);
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async delPattern(pattern, options = {}) {
    try {
      const fullPattern =
        options.usePrefix !== false
          ? this.generateKey("api", pattern)
          : pattern;
      const keys = await this.cache.keys(fullPattern);

      if (keys.length > 0) {
        const deletePromises = keys.map((key) => this.cache.del(key));
        await Promise.all(deletePromises);
        return keys.length;
      }
      return 0;
    } catch (error) {
      console.error("Cache DEL_PATTERN error:", error);
      return 0;
    }
  }

  /**
   * Cache wrapper for database queries
   */
  async remember(key, callback, ttl = 600, options = {}) {
    const cached = await this.get(key, options);

    if (cached !== null) {
      return cached;
    }

    try {
      const result = await callback();
      if (result !== null && result !== undefined) {
        await this.set(key, result, ttl, options);
      }
      return result;
    } catch (error) {
      console.error("Cache REMEMBER error:", error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      type: this.type,
      connected: this.isConnected,
      stats: this.cache.getStats(),
    };
  }

  /**
   * Flush all cache
   */
  async flush() {
    try {
      await this.cache.flush();
      return true;
    } catch (error) {
      console.error("Cache FLUSH error:", error);
      return false;
    }
  }
}

/**
 * Cache TTL Constants (in seconds)
 */
export const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 600, // 10 minutes
  HOUR: 3600, // 1 hour
  DAY: 86400, // 24 hours
  WEEK: 604800, // 7 days
};

/**
 * Cache Key Patterns
 */
export const CACHE_KEYS = {
  USER: (id) => `user:${id}`,
  USER_BOOKINGS: (userId) => `user:${userId}:bookings`,
  USER_ADDRESSES: (userId) => `user:${userId}:addresses`,
  BOOKING: (id) => `booking:${id}`,
  SERVICE: (id) => `service:${id}`,
  SERVICES_LIST: "services:list",
  SERVICES_BY_CATEGORY: (category) => `services:category:${category}`,
  SERVICES_BY_VEHICLE: (vehicle) => `services:vehicle:${vehicle}`,
  PROFESSIONALS: "professionals:list",
  PROFESSIONAL_AVAILABLE: "professionals:available",
  OFFERS: "offers:active",
  NOTIFICATIONS: (userId) => `notifications:${userId}`,
  PAYMENTS: (userId) => `payments:${userId}`,
  LOCATIONS: "locations:all",
  USER_STATS: "stats:users",
  BOOKING_STATS: "stats:bookings",
};

// Create singleton instance
const cacheManager = new CacheManager();

export { cacheManager as cache };
export default cacheManager;
