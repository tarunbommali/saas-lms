/**
 * API Helper utilities
 */

import { apiRequest } from '../api/client';

/**
 * Retry configuration
 */
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

/**
 * Sleep utility
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * API request with retry logic
 */
export const apiRequestWithRetry = async (path, options = {}, retryConfig = {}) => {
  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  let lastError;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await apiRequest(path, options);
    } catch (error) {
      lastError = error;
      
      // Don't retry if it's not a retryable error
      if (!config.retryableStatuses.includes(error.status)) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === config.maxRetries) {
        break;
      }
      
      // Exponential backoff
      const delay = config.retryDelay * Math.pow(2, attempt);
      await sleep(delay);
    }
  }
  
  throw lastError;
};

/**
 * Batch API requests
 */
export const batchRequests = async (requests, { concurrency = 5 } = {}) => {
  const results = [];
  const errors = [];
  
  for (let i = 0; i < requests.length; i += concurrency) {
    const batch = requests.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(batch);
    
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        errors.push({
          index: i + index,
          error: result.reason,
        });
      }
    });
  }
  
  return { results, errors };
};

/**
 * Handle API error and return user-friendly message
 */
export const getErrorMessage = (error) => {
  if (!error) return 'An unknown error occurred';
  
  // If it's already a string message
  if (typeof error === 'string') return error;
  
  // If it's an API error object
  if (error.message) return error.message;
  
  // Status-based messages
  const statusMessages = {
    400: 'Invalid request. Please check your input.',
    401: 'You need to sign in to continue.',
    403: 'You do not have permission to perform this action.',
    404: 'The requested resource was not found.',
    408: 'Request timeout. Please try again.',
    429: 'Too many requests. Please wait a moment and try again.',
    500: 'Server error. Please try again later.',
    502: 'Service temporarily unavailable. Please try again.',
    503: 'Service unavailable. Please try again later.',
    504: 'Request timeout. Please try again.',
  };
  
  if (error.status && statusMessages[error.status]) {
    return statusMessages[error.status];
  }
  
  // Network error
  if (error.name === 'TypeError' || error.message?.includes('fetch')) {
    return 'Network error. Please check your internet connection.';
  }
  
  return 'An error occurred. Please try again.';
};

/**
 * Create query string from object
 */
export const createQueryString = (params) => {
  if (!params || typeof params !== 'object') return '';
  
  const entries = Object.entries(params).filter(([, value]) => {
    return value !== null && value !== undefined && value !== '';
  });
  
  if (entries.length === 0) return '';
  
  const searchParams = new URLSearchParams();
  entries.forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((v) => searchParams.append(key, v));
    } else {
      searchParams.append(key, value);
    }
  });
  
  return searchParams.toString();
};

/**
 * Parse response data
 */
export const parseResponseData = (response) => {
  if (!response) return null;
  
  // If it's already parsed
  if (typeof response === 'object' && !response.data) {
    return response;
  }
  
  // If wrapped in data property
  if (response.data) {
    return response.data;
  }
  
  return response;
};

/**
 * Check if response is successful
 */
export const isSuccessResponse = (response) => {
  if (!response) return false;
  
  // Check for explicit success flag
  if (response.success !== undefined) {
    return response.success === true;
  }
  
  // Check for error flag
  if (response.error !== undefined) {
    return !response.error;
  }
  
  // Default to true if no explicit flags
  return true;
};

/**
 * Cache manager for API responses
 */
class CacheManager {
  constructor(ttl = 5 * 60 * 1000) { // 5 minutes default
    this.cache = new Map();
    this.ttl = ttl;
  }
  
  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }
  
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    // Check if expired
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  clear() {
    this.cache.clear();
  }
  
  delete(key) {
    this.cache.delete(key);
  }
}

export const apiCache = new CacheManager();

/**
 * Cached API request
 */
export const cachedApiRequest = async (path, options = {}, cacheTTL) => {
  const cacheKey = `${options.method || 'GET'}:${path}:${JSON.stringify(options.body || {})}`;
  
  // Check cache first
  const cached = apiCache.get(cacheKey);
  if (cached) return cached;
  
  // Make request
  const response = await apiRequest(path, options);
  
  // Cache response
  if (cacheTTL) {
    const cache = new CacheManager(cacheTTL);
    cache.set(cacheKey, response);
  } else {
    apiCache.set(cacheKey, response);
  }
  
  return response;
};

export default {
  apiRequestWithRetry,
  batchRequests,
  getErrorMessage,
  createQueryString,
  parseResponseData,
  isSuccessResponse,
  apiCache,
  cachedApiRequest,
};
