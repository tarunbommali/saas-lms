/**
 * DTOs (Data Transfer Objects)
 * Defines data structures for API requests and responses
 */

import { z } from 'zod';

/**
 * Auth DTOs
 */
export const SignupDTO = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  displayName: z.string().min(1).max(200).optional(),
});

export const LoginDTO = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const ForgotPasswordDTO = z.object({
  email: z.string().email('Invalid email address'),
});

export const VerifyOtpDTO = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().min(4).max(8),
});

export const ResetPasswordDTO = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
}).refine(data => data.newPassword || data.password, {
  message: 'New password is required',
});

export const UpdateProfileDTO = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  displayName: z.string().min(1).max(200).optional(),
  phone: z.string().max(32).optional(),
  college: z.string().max(191).optional(),
  gender: z.string().max(32).optional(),
  dateOfBirth: z.string().datetime().optional().or(z.date()).optional(),
  skills: z.array(z.string()).optional(),
  interests: z.array(z.string()).optional(),
});

export const GoogleAuthDTO = z.object({
  credential: z.string().min(1, 'Google credential is required'),
});

/**
 * Module DTOs
 */
export const CreateModuleDTO = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(255),
  description: z.string().optional(),
  contentType: z.enum(['video', 'text', 'quiz', 'assignment', 'resource']),
  contentUrl: z.string().url().optional().or(z.literal('')),
  contentData: z.any().optional(),
  duration: z.number().min(0).optional(),
  orderIndex: z.number().int().min(1).optional(),
  isFreePreview: z.boolean().optional().default(false),
  isPublished: z.boolean().optional().default(false),
});

export const UpdateModuleDTO = CreateModuleDTO.partial();

export const ReorderModulesDTO = z.object({
  moduleOrders: z.array(
    z.object({
      id: z.string().uuid(),
      orderIndex: z.number().int().min(1),
    })
  ),
});

/**
 * Quiz DTOs
 */
export const CreateQuizDTO = z.object({
  quiz: z.object({
    title: z.string().min(3).max(255).optional(),
    description: z.string().optional(),
    passingScore: z.number().min(0).max(100).default(70),
    timeLimit: z.number().int().min(0).optional().nullable(),
    maxAttempts: z.number().int().min(1).optional().nullable(),
    shuffleQuestions: z.boolean().optional().default(false),
  }),
  questions: z.array(
    z.object({
      question: z.string().min(5, 'Question must be at least 5 characters'),
      questionType: z.enum(['multiple_choice', 'true_false', 'short_answer']).default('multiple_choice'),
      options: z.array(z.string()).min(2, 'Must have at least 2 options'),
      correctAnswer: z.string().min(1, 'Correct answer is required'),
      points: z.number().int().min(1).default(1),
    })
  ).min(1, 'Quiz must have at least one question'),
});

export const UpdateQuizDTO = z.object({
  quiz: z.object({
    title: z.string().min(3).max(255).optional(),
    description: z.string().optional(),
    passingScore: z.number().min(0).max(100).optional(),
    timeLimit: z.number().int().min(0).optional().nullable(),
    maxAttempts: z.number().int().min(1).optional().nullable(),
    shuffleQuestions: z.boolean().optional(),
  }).optional(),
  questions: z.array(
    z.object({
      question: z.string().min(5),
      questionType: z.enum(['multiple_choice', 'true_false', 'short_answer']).default('multiple_choice'),
      options: z.array(z.string()).min(2),
      correctAnswer: z.string().min(1),
      points: z.number().int().min(1).default(1),
    })
  ).optional(),
});

export const AttemptQuizDTO = z.object({
  answers: z.record(z.string(), z.string()),
});

/**
 * Progress DTOs
 */
export const UpdateProgressDTO = z.object({
  progress: z.number().min(0).max(100).optional(),
  status: z.enum(['not_started', 'in_progress', 'completed']).optional(),
  timeSpentMinutes: z.number().int().min(0).optional(),
  lastPosition: z.number().int().min(0).optional(),
});

/**
 * Course DTOs (Enhanced)
 */
export const CreateCourseDTO = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(255),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  shortDescription: z.string().min(10).max(500).optional(),
  price: z.number().min(0, 'Price cannot be negative'),
  originalPrice: z.number().min(0).optional(),
  category: z.string().min(2, 'Category is required'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  language: z.string().default('English'),
  instructor: z.string().min(2, 'Instructor name is required').optional(),
  thumbnail: z.string().url().optional().or(z.literal('')),
  duration: z.number().min(0).optional(),
});

export const UpdateCourseDTO = CreateCourseDTO.partial();

/**
 * Enrollment DTOs
 */
export const CreateEnrollmentDTO = z.object({
  courseId: z.string().uuid('Invalid course ID'),
  paymentId: z.string().uuid().optional(),
  enrollmentSource: z.enum(['purchase', 'free', 'admin_grant', 'coupon']).optional().default('purchase'),
});

/**
 * Certificate DTOs
 */
export const RequestCertificateDTO = z.object({
  enrollmentId: z.string().uuid('Invalid enrollment ID'),
});

export const RevokeCertificateDTO = z.object({
  reason: z.string().min(10, 'Revocation reason must be at least 10 characters'),
});

/**
 * Pagination DTO
 */
export const PaginationDTO = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export default {
  CreateModuleDTO,
  UpdateModuleDTO,
  ReorderModulesDTO,
  CreateQuizDTO,
  UpdateQuizDTO,
  AttemptQuizDTO,
  UpdateProgressDTO,
  CreateCourseDTO,
  UpdateCourseDTO,
  CreateEnrollmentDTO,
  RequestCertificateDTO,
  RevokeCertificateDTO,
  PaginationDTO,
};
