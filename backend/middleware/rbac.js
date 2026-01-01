/**
 * Role-Based Access Control Middleware
 * Provides authorization middleware for different user roles
 */

import { ApiError } from './errorHandler.js';

/**
 * Require Admin role
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }
  
  if (!req.user.isAdmin) {
    throw new ApiError(403, 'Admin access required');
  }
  
  next();
};

/**
 * Require Instructor role (can be admin or instructor)
 */
export const requireInstructor = async (req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }
  
  // Admins have instructor privileges
  if (req.user.isAdmin) {
    return next();
  }
  
  // Check if user has instructor role
  // For now, we check if user has created any courses
  // In production, you'd have an isInstructor field
  if (!req.user.isInstructor && !req.user.isAdmin) {
    throw new ApiError(403, 'Instructor access required');
  }
  
  next();
};

/**
 * Require Student role (any authenticated user)
 */
export const requireStudent = (req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }
  
  next();
};

/**
 * Check if user owns the resource
 * Used for user-specific resources like profile, enrollments
 */
export const requireOwnership = (resourceUserIdField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }
    
    // Admins bypass ownership checks
    if (req.user.isAdmin) {
      return next();
    }
    
    // Check if resource belongs to user
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    
    if (!resourceUserId) {
      // If no user ID in params/body, assume user accessing their own resource
      return next();
    }
    
    if (resourceUserId !== req.user.id) {
      throw new ApiError(403, 'You do not have permission to access this resource');
    }
    
    next();
  };
};

/**
 * Check course ownership (for instructors editing their courses)
 */
export const requireCourseOwnership = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }
    
    // Admins bypass ownership checks
    if (req.user.isAdmin) {
      return next();
    }
    
    const { courseId, id } = req.params;
    const targetCourseId = courseId || id;
    
    if (!targetCourseId) {
      return next(); // Let the controller handle missing courseId
    }
    
    // Import courseRepository here to avoid circular dependency
    const { default: courseRepository } = await import('../repositories/course.repository.js');
    
    const course = await courseRepository.findById(targetCourseId);
    
    if (!course) {
      throw new ApiError(404, 'Course not found');
    }
    
    if (course.instructorId !== req.user.id) {
      throw new ApiError(403, 'You do not have permission to modify this course');
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Require either Admin or Owner
 */
export const requireAdminOrOwner = (userIdField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }
    
    // Admins have access
    if (req.user.isAdmin) {
      return next();
    }
    
    // Check ownership
    const resourceUserId = req.params[userIdField] || req.body[userIdField];
    
    if (resourceUserId && resourceUserId !== req.user.id) {
      throw new ApiError(403, 'You do not have permission to access this resource');
    }
    
    next();
  };
};

/**
 * Optional authentication
 * Sets req.user if token is valid, but doesn't fail if no token
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return next(); // No token, continue without user
    }
    
    // Import here to avoid circular dependency
    const { verifyToken } = await import('./auth.js');
    const decoded = verifyToken(token);
    
    // Import userRepository
    const { default: userRepository } = await import('../repositories/user.repository.js');
    const user = await userRepository.findById(decoded.id);
    
    if (user) {
      req.user = user;
    }
    
    next();
  } catch (error) {
    // Invalid token, continue without user
    next();
  }
};

export default {
  requireAdmin,
  requireInstructor,
  requireStudent,
  requireOwnership,
  requireCourseOwnership,
  requireAdminOrOwner,
  optionalAuth,
};
