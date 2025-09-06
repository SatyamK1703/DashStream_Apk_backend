/**
 * Firebase Utilities for optimized database operations
 */
import { database } from '../config/firebase.js';
import AppError from './appError.js';

/**
 * Error codes for Firebase operations
 */
export const FirebaseErrorCodes = {
  CONNECTION_FAILED: 'FIREBASE_CONNECTION_FAILED',
  WRITE_FAILED: 'FIREBASE_WRITE_FAILED',
  READ_FAILED: 'FIREBASE_READ_FAILED',
  PERMISSION_DENIED: 'FIREBASE_PERMISSION_DENIED',
  INVALID_PATH: 'FIREBASE_INVALID_PATH',
  TRANSACTION_FAILED: 'FIREBASE_TRANSACTION_FAILED',
  BATCH_OPERATION_FAILED: 'FIREBASE_BATCH_OPERATION_FAILED'
};

/**
 * Connection pool for Firebase Realtime Database
 * Reuses database references to improve performance
 */
class DatabaseConnectionPool {
  constructor() {
    this.refCache = new Map();
    this.maxCacheSize = 100; // Maximum number of references to cache
  }

  /**
   * Get a database reference, either from cache or create a new one
   * @param {string} path - The database path
   * @returns {Object} Firebase database reference
   */
  getRef(path) {
    if (!path) {
      throw new AppError('Invalid database path', 400, FirebaseErrorCodes.INVALID_PATH);
    }

    if (this.refCache.has(path)) {
      return this.refCache.get(path);
    }

    // Create new reference
    const ref = database.ref(path);

    // Add to cache if not at capacity
    if (this.refCache.size < this.maxCacheSize) {
      this.refCache.set(path, ref);
    } else {
      // Remove oldest entry (first key in map) if at capacity
      const firstKey = this.refCache.keys().next().value;
      this.refCache.delete(firstKey);
      this.refCache.set(path, ref);
    }

    return ref;
  }

  /**
   * Clear the reference cache
   */
  clearCache() {
    this.refCache.clear();
  }
}

// Create a singleton instance
const connectionPool = new DatabaseConnectionPool();

/**
 * Wrapper for Firebase read operations with error handling
 * @param {string} path - Database path to read from
 * @param {Object} options - Additional options
 * @returns {Promise<any>} The data at the specified path
 */
export const safeRead = async (path, options = {}) => {
  try {
    const ref = connectionPool.getRef(path);
    const snapshot = await ref.once('value');
    return options.raw ? snapshot : snapshot.val();
  } catch (error) {
    console.error(`Firebase read error at ${path}:`, error);
    
    // Map Firebase errors to our error codes
    let errorCode = FirebaseErrorCodes.READ_FAILED;
    let statusCode = 500;
    
    if (error.code === 'PERMISSION_DENIED') {
      errorCode = FirebaseErrorCodes.PERMISSION_DENIED;
      statusCode = 403;
    }
    
    throw new AppError(
      `Failed to read from Firebase: ${error.message}`, 
      statusCode, 
      errorCode
    );
  }
};

/**
 * Wrapper for Firebase write operations with error handling
 * @param {string} path - Database path to write to
 * @param {any} data - Data to write
 * @param {Object} options - Additional options
 * @returns {Promise<void>}
 */
export const safeWrite = async (path, data, options = {}) => {
  try {
    const ref = connectionPool.getRef(path);
    
    if (options.update) {
      await ref.update(data);
    } else {
      await ref.set(data);
    }
    
    return { success: true };
  } catch (error) {
    console.error(`Firebase write error at ${path}:`, error);
    
    // Map Firebase errors to our error codes
    let errorCode = FirebaseErrorCodes.WRITE_FAILED;
    let statusCode = 500;
    
    if (error.code === 'PERMISSION_DENIED') {
      errorCode = FirebaseErrorCodes.PERMISSION_DENIED;
      statusCode = 403;
    }
    
    throw new AppError(
      `Failed to write to Firebase: ${error.message}`, 
      statusCode, 
      errorCode
    );
  }
};

/**
 * Perform a batch write operation to multiple paths
 * @param {Object} pathDataMap - Map of paths to data {'/path1': data1, '/path2': data2}
 * @returns {Promise<Object>} Result of the batch operation
 */
export const batchWrite = async (pathDataMap) => {
  if (!pathDataMap || typeof pathDataMap !== 'object') {
    throw new AppError('Invalid batch write data', 400, FirebaseErrorCodes.INVALID_PATH);
  }
  
  try {
    const updates = {};
    
    // Prepare updates object
    Object.entries(pathDataMap).forEach(([path, data]) => {
      updates[path] = data;
    });
    
    // Perform batch update
    await database.ref().update(updates);
    
    return { success: true, updatedPaths: Object.keys(pathDataMap) };
  } catch (error) {
    console.error('Firebase batch write error:', error);
    
    throw new AppError(
      `Failed to perform batch write: ${error.message}`, 
      500, 
      FirebaseErrorCodes.BATCH_OPERATION_FAILED
    );
  }
};

/**
 * Perform a transaction on a Firebase path with retry logic
 * @param {string} path - Database path
 * @param {Function} updateFn - Function to update the current value
 * @param {Object} options - Options including maxRetries
 * @returns {Promise<Object>} Result of the transaction
 */
export const safeTransaction = async (path, updateFn, options = { maxRetries: 3 }) => {
  let attempts = 0;
  const maxRetries = options.maxRetries || 3;
  
  while (attempts < maxRetries) {
    try {
      const ref = connectionPool.getRef(path);
      const result = await ref.transaction(updateFn);
      
      if (result.committed) {
        return { 
          success: true, 
          committed: true, 
          snapshot: result.snapshot.val() 
        };
      } else {
        // Transaction aborted but not due to error
        attempts++;
        continue;
      }
    } catch (error) {
      console.error(`Firebase transaction error at ${path} (attempt ${attempts + 1}):`, error);
      attempts++;
      
      // If we've exhausted retries, throw error
      if (attempts >= maxRetries) {
        throw new AppError(
          `Transaction failed after ${maxRetries} attempts: ${error.message}`, 
          500, 
          FirebaseErrorCodes.TRANSACTION_FAILED
        );
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 300 * Math.pow(2, attempts)));
    }
  }
};

/**
 * Listen for real-time updates with automatic reconnection
 * @param {string} path - Database path to listen to
 * @param {Function} callback - Callback function for data changes
 * @param {Object} options - Options including event type
 * @returns {Function} Unsubscribe function
 */
export const safeListener = (path, callback, options = {}) => {
  const eventType = options.eventType || 'value';
  const ref = connectionPool.getRef(path);
  
  // Error handler with reconnection logic
  const errorHandler = (error) => {
    console.error(`Firebase listener error at ${path}:`, error);
    
    // Attempt to reconnect after delay
    setTimeout(() => {
      console.log(`Attempting to reconnect listener at ${path}`);
      ref.off(eventType, dataHandler);
      ref.off('error', errorHandler);
      
      ref.on(eventType, dataHandler);
      ref.on('error', errorHandler);
    }, 5000); // 5 second delay before reconnection attempt
  };
  
  // Data handler
  const dataHandler = (snapshot) => {
    try {
      callback(null, snapshot);
    } catch (error) {
      console.error('Error in listener callback:', error);
      callback(error, null);
    }
  };
  
  // Set up listeners
  ref.on(eventType, dataHandler);
  ref.on('error', errorHandler);
  
  // Return unsubscribe function
  return () => {
    ref.off(eventType, dataHandler);
    ref.off('error', errorHandler);
  };
};

/**
 * Remove data at a specific path
 * @param {string} path - Database path to remove
 * @returns {Promise<Object>} Result of the operation
 */
export const safeRemove = async (path) => {
  try {
    const ref = connectionPool.getRef(path);
    await ref.remove();
    return { success: true };
  } catch (error) {
    console.error(`Firebase remove error at ${path}:`, error);
    
    throw new AppError(
      `Failed to remove data from Firebase: ${error.message}`, 
      500, 
      FirebaseErrorCodes.WRITE_FAILED
    );
  }
};

/**
 * Check if a path exists in the database
 * @param {string} path - Database path to check
 * @returns {Promise<boolean>} Whether the path exists
 */
export const pathExists = async (path) => {
  try {
    const ref = connectionPool.getRef(path);
    const snapshot = await ref.once('value');
    return snapshot.exists();
  } catch (error) {
    console.error(`Firebase path check error at ${path}:`, error);
    return false;
  }
};

export default {
  safeRead,
  safeWrite,
  batchWrite,
  safeTransaction,
  safeListener,
  safeRemove,
  pathExists,
  FirebaseErrorCodes
};