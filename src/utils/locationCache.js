/**
 * Location Cache Utility
 * Provides caching for frequently accessed location data to reduce Firebase reads
 */

import NodeCache from 'node-cache';

// Cache configuration
const DEFAULT_TTL = 60; // Default time-to-live in seconds
const CHECK_PERIOD = 120; // Period in seconds to check for expired keys

/**
 * Location cache implementation using node-cache
 */
class LocationCache {
  constructor(options = {}) {
    this.cache = new NodeCache({
      stdTTL: options.ttl || DEFAULT_TTL,
      checkperiod: options.checkPeriod || CHECK_PERIOD,
      useClones: false // For better performance
    });
    
    // Statistics for monitoring cache performance
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0
    };
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {any|null} Cached value or null if not found
   */
  get(key) {
    const value = this.cache.get(key);
    
    if (value !== undefined) {
      this.stats.hits++;
      return value;
    }
    
    this.stats.misses++;
    return null;
  }

  /**
   * Set a value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {boolean} Success
   */
  set(key, value, ttl = DEFAULT_TTL) {
    this.stats.sets++;
    return this.cache.set(key, value, ttl);
  }

  /**
   * Delete a value from cache
   * @param {string} key - Cache key
   * @returns {number} Number of deleted entries
   */
  del(key) {
    return this.cache.del(key);
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {boolean} Whether key exists
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * Flush the entire cache
   */
  flush() {
    this.cache.flushAll();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const cacheStats = this.cache.getStats();
    return {
      ...this.stats,
      keys: this.cache.keys().length,
      ...cacheStats
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0
    };
  }
}

// Create singleton instances for different types of location data
const professionalLocationCache = new LocationCache({ ttl: 30 }); // 30 seconds TTL for current locations
const locationHistoryCache = new LocationCache({ ttl: 300 }); // 5 minutes TTL for location history
const nearbyProfessionalsCache = new LocationCache({ ttl: 60 }); // 1 minute TTL for nearby professionals

/**
 * Generate a cache key for nearby professionals search
 * @param {Object} coordinates - Coordinates object with latitude and longitude
 * @param {number} maxDistance - Maximum distance in meters
 * @param {Object} filters - Additional filters
 * @returns {string} Cache key
 */
const generateNearbyKey = (coordinates, maxDistance, filters = {}) => {
  const { latitude, longitude } = coordinates;
  const filterString = Object.entries(filters)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, value]) => `${key}:${Array.isArray(value) ? value.sort().join(',') : value}`)
    .join('|');
  
  return `nearby:${latitude.toFixed(4)}:${longitude.toFixed(4)}:${maxDistance}${filterString ? ':' + filterString : ''}`;
};

/**
 * Generate a cache key for location history
 * @param {string} professionalId - Professional ID
 * @param {number} limit - Limit of history items
 * @returns {string} Cache key
 */
const generateHistoryKey = (professionalId, limit) => {
  return `history:${professionalId}:${limit}`;
};

export {
  professionalLocationCache,
  locationHistoryCache,
  nearbyProfessionalsCache,
  generateNearbyKey,
  generateHistoryKey
};