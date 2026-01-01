/* eslint-disable no-console */

/**
 * Enhanced error handling middleware
 */

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(statusCode, message, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Not Found Error (404)
 */
export const notFound = (req, res, next) => {
  const error = new ApiError(404, `Route not found: ${req.originalUrl}`);
  next(error);
};

/**
 * Centralized error handler
 */
export const errorHandler = (err, req, res, next) => {
  let { statusCode = 500, message } = err;

  // Log error for debugging
  if (process.env.NODE_ENV === 'development') {
    console.error('Error Details:', {
      message: err.message,
      stack: err.stack,
      statusCode,
      path: req.path,
      method: req.method,
    });
  } else {
    console.error('Error:', err.message);
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
  }

  if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized access';
  }

  if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    message = 'Duplicate entry. Resource already exists';
  }

  if (err.code === 'ER_BAD_FIELD_ERROR') {
    statusCode = 400;
    message = 'Invalid field in query';
  }

  // MySQL/Database errors
  if (err.code && err.code.startsWith('ER_')) {
    statusCode = 500;
    message = 'Database error occurred';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Prepare error response
  const errorResponse = {
    error: message,
    statusCode,
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.details = err;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Async handler wrapper to catch errors
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Validation error handler
 */
export const handleValidationError = (error) => {
  const errors = Object.values(error.errors).map((err) => err.message);
  const message = `Invalid input: ${errors.join(', ')}`;
  return new ApiError(400, message);
};

/**
 * Cast error handler
 */
export const handleCastError = (error) => {
  const message = `Invalid ${error.path}: ${error.value}`;
  return new ApiError(400, message);
};

/**
 * Duplicate field error handler
 */
export const handleDuplicateFieldsError = (error) => {
  const field = Object.keys(error.keyValue)[0];
  const message = `${field} already exists. Please use another value.`;
  return new ApiError(409, message);
};

/**
 * Rate limit handler
 */
export const rateLimitHandler = (req, res) => {
  res.status(429).json({
    error: 'Too many requests',
    message: 'You have exceeded the rate limit. Please try again later.',
    retryAfter: req.rateLimit?.resetTime,
  });
};

export default {
  ApiError,
  notFound,
  errorHandler,
  asyncHandler,
  handleValidationError,
  handleCastError,
  handleDuplicateFieldsError,
  rateLimitHandler,
};
