/**
 * Enrollment Service
 * Business logic for enrollment management
 */

import { randomUUID } from 'crypto';
import enrollmentRepository from '../repositories/enrollment.repository.js';
import courseRepository from '../repositories/course.repository.js';
import userRepository from '../repositories/user.repository.js';

export class EnrollmentService {
  /**
   * Enroll user in course
   * @param {string} userId - User ID
   * @param {string} courseId - Course ID
   * @param {Object} enrollmentData - Additional enrollment data
   * @returns {Promise<Object>}
   */
  async enrollUser(userId, courseId, enrollmentData = {}) {
    // Check if user exists
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Check if course exists and is published
    const course = await courseRepository.findById(courseId);
    if (!course) {
      throw new Error('Course not found');
    }
    
    if (!course.isPublished) {
      throw new Error('Course is not available for enrollment');
    }
    
    // Check if already enrolled
    const existingEnrollment = await enrollmentRepository.findByUserAndCourse(userId, courseId);
    if (existingEnrollment) {
      throw new Error('User is already enrolled in this course');
    }
    
    // Create enrollment
    const enrollmentId = randomUUID();
    const enrollment = await enrollmentRepository.create({
      id: enrollmentId,
      userId,
      courseId,
      status: 'active',
      progress: 0,
      enrolledAt: new Date(),
      ...enrollmentData,
    });
    
    // Increment course enrollment count
    await courseRepository.incrementEnrollmentCount(courseId);
    
    return enrollment;
  }

  /**
   * Get user enrollments
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>}
   */
  async getUserEnrollments(userId, options = {}) {
    const { page = 1, limit = 10, status } = options;
    const offset = (page - 1) * limit;
    
    const enrollments = await enrollmentRepository.findByUser(userId, {
      status,
      limit,
      offset,
    });
    
    return {
      enrollments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
      },
    };
  }

  /**
   * Get course enrollments (admin)
   * @param {string} courseId - Course ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>}
   */
  async getCourseEnrollments(courseId, options = {}) {
    const { page = 1, limit = 10, status } = options;
    const offset = (page - 1) * limit;
    
    const enrollments = await enrollmentRepository.findByCourse(courseId, {
      status,
      limit,
      offset,
    });
    
    return {
      enrollments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
      },
    };
  }

  /**
   * Get enrollment details
   * @param {string} enrollmentId - Enrollment ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Promise<Object>}
   */
  async getEnrollmentDetails(enrollmentId, userId) {
    const enrollment = await enrollmentRepository.findById(enrollmentId);
    
    if (!enrollment) {
      throw new Error('Enrollment not found');
    }
    
    // Check authorization
    if (enrollment.userId !== userId) {
      throw new Error('You do not have permission to view this enrollment');
    }
    
    return enrollment;
  }

  /**
   * Update enrollment progress
   * @param {string} enrollmentId - Enrollment ID
   * @param {number} progress - Progress percentage
   * @param {string} userId - User ID (for authorization)
   * @returns {Promise<Object>}
   */
  async updateProgress(enrollmentId, progress, userId) {
    const enrollment = await enrollmentRepository.findById(enrollmentId);
    
    if (!enrollment) {
      throw new Error('Enrollment not found');
    }
    
    if (enrollment.userId !== userId) {
      throw new Error('You do not have permission to update this enrollment');
    }
    
    // Validate progress
    if (progress < 0 || progress > 100) {
      throw new Error('Progress must be between 0 and 100');
    }
    
    const updatedEnrollment = await enrollmentRepository.updateProgress(enrollmentId, progress);
    
    // If completed, increment course completion count
    if (progress >= 100 && enrollment.progress < 100) {
      const course = await courseRepository.findById(enrollment.courseId);
      await courseRepository.updateStatistics(course.id, {
        completionCount: (course.completionCount || 0) + 1,
      });
    }
    
    return updatedEnrollment;
  }

  /**
   * Mark enrollment as completed
   * @param {string} enrollmentId - Enrollment ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Promise<Object>}
   */
  async completeEnrollment(enrollmentId, userId) {
    const enrollment = await enrollmentRepository.findById(enrollmentId);
    
    if (!enrollment) {
      throw new Error('Enrollment not found');
    }
    
    if (enrollment.userId !== userId) {
      throw new Error('You do not have permission to complete this enrollment');
    }
    
    if (enrollment.status === 'completed') {
      throw new Error('Enrollment is already completed');
    }
    
    const completedEnrollment = await enrollmentRepository.markCompleted(enrollmentId);
    
    // Increment course completion count
    const course = await courseRepository.findById(enrollment.courseId);
    await courseRepository.updateStatistics(course.id, {
      completionCount: (course.completionCount || 0) + 1,
    });
    
    return completedEnrollment;
  }

  /**
   * Check if user is enrolled
   * @param {string} userId - User ID
   * @param {string} courseId - Course ID
   * @returns {Promise<boolean>}
   */
  async isUserEnrolled(userId, courseId) {
    return await enrollmentRepository.isEnrolled(userId, courseId);
  }

  /**
   * Get user enrollment statistics
   * @param {string} userId - User ID
   * @returns {Promise<Object>}
   */
  async getUserStatistics(userId) {
    return await enrollmentRepository.getUserStats(userId);
  }

  /**
   * Get course enrollment statistics
   * @param {string} courseId - Course ID
   * @returns {Promise<Object>}
   */
  async getCourseStatistics(courseId) {
    return await enrollmentRepository.getCourseStats(courseId);
  }

  /**
   * Get recent enrollments (admin)
   * @param {number} limit - Number of enrollments
   * @returns {Promise<Array>}
   */
  async getRecentEnrollments(limit = 10) {
    return await enrollmentRepository.getRecent(limit);
  }
}

export default new EnrollmentService();
