import { z } from 'zod';

/**
 * Shared validation schemas and utilities
 */

// Email validation
export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .email('Invalid email address');

// Password validation
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// Phone validation
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/, 'Invalid phone number')
  .optional()
  .or(z.literal(''));

// Name validation
export const nameSchema = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(50, 'Name must be less than 50 characters')
  .regex(/^[a-zA-Z\s]+$/, 'Name must contain only letters');

// OTP validation
export const otpSchema = z
  .string()
  .trim()
  .length(6, 'OTP must be exactly 6 digits')
  .regex(/^[0-9]{6}$/, 'OTP must contain only numbers');

// Price validation
export const priceSchema = z
  .number()
  .min(0, 'Price cannot be negative')
  .max(999999, 'Price is too high');

// URL validation
export const urlSchema = z
  .string()
  .trim()
  .url('Invalid URL')
  .optional()
  .or(z.literal(''));

// Auth Schemas
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  firstName: nameSchema,
  lastName: nameSchema,
  phone: phoneSchema,
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  otp: otpSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// Profile Schema
export const profileSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  phone: phoneSchema,
  college: z.string().trim().optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  dateOfBirth: z.string().optional(),
});

// Course Schema
export const courseSchema = z.object({
  title: z.string().trim().min(5, 'Title must be at least 5 characters').max(255, 'Title is too long'),
  description: z.string().trim().min(20, 'Description must be at least 20 characters'),
  shortDescription: z.string().trim().min(10, 'Short description must be at least 10 characters').max(500),
  price: priceSchema,
  originalPrice: priceSchema.optional(),
  instructor: nameSchema,
  category: z.string().trim().min(2, 'Category is required'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  language: z.string().trim().min(2, 'Language is required'),
  thumbnail: urlSchema,
  duration: z.number().min(0).optional(),
});

// Coupon Schema
export const couponSchema = z.object({
  code: z.string().trim().min(3, 'Code must be at least 3 characters').max(50).toUpperCase(),
  discount: z.number().min(0, 'Discount cannot be negative').max(100, 'Discount cannot exceed 100%'),
  expiresAt: z.string().or(z.date()),
  maxUses: z.number().min(1, 'Max uses must be at least 1').optional(),
});

/**
 * Validate data against a schema
 */
export const validateData = (schema, data) => {
  try {
    return {
      success: true,
      data: schema.parse(data),
      errors: null,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: error.errors.reduce((acc, err) => {
          const path = err.path.join('.');
          acc[path] = err.message;
          return acc;
        }, {}),
      };
    }
    return {
      success: false,
      data: null,
      errors: { general: 'Validation failed' },
    };
  }
};

/**
 * Safe parse with default value
 */
export const safeParse = (schema, data, defaultValue = null) => {
  const result = schema.safeParse(data);
  return result.success ? result.data : defaultValue;
};

export default {
  emailSchema,
  passwordSchema,
  phoneSchema,
  nameSchema,
  otpSchema,
  priceSchema,
  urlSchema,
  signInSchema,
  signUpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  profileSchema,
  courseSchema,
  couponSchema,
  validateData,
  safeParse,
};
