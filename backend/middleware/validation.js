import { z } from 'zod';

/**
 * Backend validation middleware using Zod
 */

/**
 * Create validation middleware
 */
export const validate = (schema) => {
  return (req, res, next) => {
    try {
      // Validate request body, query, and params
      const validatedData = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Replace with validated data
      req.body = validatedData.body || req.body;
      req.query = validatedData.query || req.query;
      req.params = validatedData.params || req.params;

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      next(error);
    }
  };
};

/**
 * Validate only request body
 */
export const validateBody = (schema) => {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      next(error);
    }
  };
};

/**
 * Validate only query parameters
 */
export const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      next(error);
    }
  };
};

/**
 * Common validation schemas
 */
export const schemas = {
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  uuid: z.string().uuid('Invalid ID format'),
  positiveInt: z.number().int().positive('Must be a positive integer'),
  nonNegativeInt: z.number().int().min(0, 'Must be non-negative'),
  url: z.string().url('Invalid URL'),
  date: z.string().datetime('Invalid date format'),
};

/**
 * Auth validation schemas
 */
export const authSchemas = {
  login: z.object({
    body: z.object({
      email: schemas.email,
      password: z.string().min(1, 'Password is required'),
    }),
  }),
  
  signup: z.object({
    body: z.object({
      email: schemas.email,
      password: schemas.password,
      firstName: z.string().min(2, 'First name must be at least 2 characters'),
      lastName: z.string().min(2, 'Last name must be at least 2 characters'),
      phone: z.string().optional(),
    }),
  }),
  
  forgotPassword: z.object({
    body: z.object({
      email: schemas.email,
    }),
  }),
  
  resetPassword: z.object({
    body: z.object({
      email: schemas.email,
      otp: z.string().length(6, 'OTP must be 6 digits'),
      newPassword: schemas.password,
    }),
  }),
};

/**
 * Course validation schemas
 */
export const courseSchemas = {
  create: z.object({
    body: z.object({
      title: z.string().min(5, 'Title must be at least 5 characters'),
      description: z.string().min(20, 'Description must be at least 20 characters'),
      price: schemas.nonNegativeInt,
      instructor: z.string().min(2, 'Instructor name is required'),
      category: z.string().min(2, 'Category is required'),
      difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    }),
  }),
  
  update: z.object({
    params: z.object({
      id: schemas.uuid,
    }),
    body: z.object({
      title: z.string().min(5).optional(),
      description: z.string().min(20).optional(),
      price: schemas.nonNegativeInt.optional(),
      instructor: z.string().min(2).optional(),
      category: z.string().min(2).optional(),
      difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    }),
  }),
};

/**
 * Pagination validation schema
 */
export const paginationSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    sortBy: z.string().optional(),
    order: z.enum(['asc', 'desc']).default('desc'),
  }),
});

export default {
  validate,
  validateBody,
  validateQuery,
  schemas,
  authSchemas,
  courseSchemas,
  paginationSchema,
};
