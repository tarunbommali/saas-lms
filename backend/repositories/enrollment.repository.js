/**
 * Enrollment Repository
 * Handles all database operations for enrollments
 */

import { eq, and, desc, sql } from 'drizzle-orm';
import { enrollments, courses } from '../db/schema.js';
import { BaseRepository } from './base.repository.js';

export class EnrollmentRepository extends BaseRepository {
  constructor() {
    super(enrollments);
  }

  /**
   * Find enrollment by user and course
   * @param {string} userId - User ID
   * @param {string} courseId - Course ID
   * @returns {Promise<Object|null>}
   */
  async findByUserAndCourse(userId, courseId) {
    return await this.findOne(
      and(
        eq(enrollments.userId, userId),
        eq(enrollments.courseId, courseId)
      )
    );
  }

  /**
   * Find user enrollments
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findByUser(userId, options = {}) {
    const { status, limit = 10, offset = 0 } = options;
    
    let whereConditions = [eq(enrollments.userId, userId)];
    
    if (status) {
      whereConditions.push(eq(enrollments.status, status));
    }
    
    return await this.db
      .select({
        enrollment: enrollments,
        course: courses,
      })
      .from(enrollments)
      .leftJoin(courses, eq(enrollments.courseId, courses.id))
      .where(and(...whereConditions))
      .orderBy(desc(enrollments.enrolledAt))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Find course enrollments
   * @param {string} courseId - Course ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findByCourse(courseId, options = {}) {
    const { status, limit = 10, offset = 0 } = options;
    
    let whereConditions = [eq(enrollments.courseId, courseId)];
    
    if (status) {
      whereConditions.push(eq(enrollments.status, status));
    }
    
    return await this.db
      .select()
      .from(enrollments)
      .where(and(...whereConditions))
      .orderBy(desc(enrollments.enrolledAt))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Check if user is enrolled
   * @param {string} userId - User ID
   * @param {string} courseId - Course ID
   * @returns {Promise<boolean>}
   */
  async isEnrolled(userId, courseId) {
    const enrollment = await this.findByUserAndCourse(userId, courseId);
    return !!enrollment && enrollment.status === 'active';
  }

  /**
   * Update progress
   * @param {string} enrollmentId - Enrollment ID
   * @param {number} progress - Progress percentage
   * @returns {Promise<Object>}
   */
  async updateProgress(enrollmentId, progress) {
    const updateData = {
      progress,
      lastAccessedAt: new Date(),
    };
    
    // Check if completed
    if (progress >= 100) {
      updateData.status = 'completed';
      updateData.completedAt = new Date();
    }
    
    return await this.update(enrollmentId, updateData);
  }

  /**
   * Mark as completed
   * @param {string} enrollmentId - Enrollment ID
   * @returns {Promise<Object>}
   */
  async markCompleted(enrollmentId) {
    return await this.update(enrollmentId, {
      status: 'completed',
      progress: 100,
      completedAt: new Date(),
    });
  }

  /**
   * Get user statistics
   * @param {string} userId - User ID
   * @returns {Promise<Object>}
   */
  async getUserStats(userId) {
    const stats = await this.db
      .select({
        status: enrollments.status,
        count: sql`COUNT(*)`,
      })
      .from(enrollments)
      .where(eq(enrollments.userId, userId))
      .groupBy(enrollments.status);
    
    return stats.reduce((acc, row) => {
      acc[row.status] = Number(row.count);
      return acc;
    }, {});
  }

  /**
   * Get course statistics
   * @param {string} courseId - Course ID
   * @returns {Promise<Object>}
   */
  async getCourseStats(courseId) {
    const result = await this.db
      .select({
        totalEnrollments: sql`COUNT(*)`,
        activeEnrollments: sql`SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END)`,
        completedEnrollments: sql`SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)`,
        averageProgress: sql`AVG(progress)`,
      })
      .from(enrollments)
      .where(eq(enrollments.courseId, courseId));
    
    return result[0] || {};
  }

  /**
   * Get recent enrollments
   * @param {number} limit - Number of enrollments
   * @returns {Promise<Array>}
   */
  async getRecent(limit = 10) {
    return await this.db
      .select({
        enrollment: enrollments,
        course: courses,
      })
      .from(enrollments)
      .leftJoin(courses, eq(enrollments.courseId, courses.id))
      .orderBy(desc(enrollments.enrolledAt))
      .limit(limit);
  }
}

export default new EnrollmentRepository();
