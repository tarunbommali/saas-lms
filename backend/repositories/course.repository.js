/**
 * Course Repository
 * Handles all database operations for courses
 */

import { eq, and, desc, like, or, sql } from 'drizzle-orm';
import { courses } from '../db/schema.js';
import { BaseRepository } from './base.repository.js';

export class CourseRepository extends BaseRepository {
  constructor() {
    super(courses);
  }

  /**
   * Find published courses
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findPublished(options = {}) {
    const { limit = 10, offset = 0, category, difficulty, orderBy } = options;
    
    let whereConditions = [eq(courses.isPublished, true)];
    
    if (category) {
      whereConditions.push(eq(courses.category, category));
    }
    
    if (difficulty) {
      whereConditions.push(eq(courses.difficulty, difficulty));
    }
    
    let query = this.db
      .select()
      .from(courses)
      .where(and(...whereConditions))
      .limit(limit)
      .offset(offset);
    
    if (orderBy) {
      query = query.orderBy(desc(courses[orderBy]));
    }
    
    return await query;
  }

  /**
   * Find course by slug
   * @param {string} slug - Course slug
   * @returns {Promise<Object|null>}
   */
  async findBySlug(slug) {
    return await this.findOne(eq(courses.slug, slug));
  }

  /**
   * Search courses
   * @param {string} query - Search query
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async search(query, options = {}) {
    const searchTerm = `%${query}%`;
    const { limit = 10, offset = 0 } = options;
    
    return await this.db
      .select()
      .from(courses)
      .where(
        and(
          eq(courses.isPublished, true),
          or(
            like(courses.title, searchTerm),
            like(courses.shortDescription, searchTerm),
            like(courses.description, searchTerm)
          )
        )
      )
      .limit(limit)
      .offset(offset);
  }

  /**
   * Get featured courses
   * @param {number} limit - Number of courses
   * @returns {Promise<Array>}
   */
  async getFeatured(limit = 6) {
    return await this.db
      .select()
      .from(courses)
      .where(
        and(
          eq(courses.isPublished, true),
          eq(courses.isFeatured, true)
        )
      )
      .orderBy(desc(courses.createdAt))
      .limit(limit);
  }

  /**
   * Get popular courses
   * @param {number} limit - Number of courses
   * @returns {Promise<Array>}
   */
  async getPopular(limit = 6) {
    return await this.db
      .select()
      .from(courses)
      .where(eq(courses.isPublished, true))
      .orderBy(desc(courses.enrollmentCount))
      .limit(limit);
  }

  /**
   * Get courses by category
   * @param {string} category - Category name
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findByCategory(category, options = {}) {
    return await this.findPublished({ ...options, category });
  }

  /**
   * Get courses by instructor
   * @param {string} instructorId - Instructor ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findByInstructor(instructorId, options = {}) {
    const { limit = 10, offset = 0 } = options;
    
    return await this.db
      .select()
      .from(courses)
      .where(eq(courses.instructorId, instructorId))
      .orderBy(desc(courses.createdAt))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Increment enrollment count
   * @param {string} courseId - Course ID
   * @returns {Promise<Object>}
   */
  async incrementEnrollmentCount(courseId) {
    await this.db
      .update(courses)
      .set({
        enrollmentCount: sql`${courses.enrollmentCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(courses.id, courseId))
      .execute();
    
    return await this.findById(courseId);
  }

  /**
   * Update course statistics
   * @param {string} courseId - Course ID
   * @param {Object} stats - Statistics to update
   * @returns {Promise<Object>}
   */
  async updateStatistics(courseId, stats) {
    const updateData = {};
    
    if (stats.enrollmentCount !== undefined) {
      updateData.enrollmentCount = stats.enrollmentCount;
    }
    if (stats.completionCount !== undefined) {
      updateData.completionCount = stats.completionCount;
    }
    if (stats.averageRating !== undefined) {
      updateData.averageRating = stats.averageRating;
    }
    if (stats.reviewCount !== undefined) {
      updateData.reviewCount = stats.reviewCount;
    }
    
    return await this.update(courseId, updateData);
  }

  /**
   * Publish course
   * @param {string} courseId - Course ID
   * @returns {Promise<Object>}
   */
  async publish(courseId) {
    return await this.update(courseId, {
      isPublished: true,
      publishedAt: new Date(),
    });
  }

  /**
   * Unpublish course
   * @param {string} courseId - Course ID
   * @returns {Promise<Object>}
   */
  async unpublish(courseId) {
    return await this.update(courseId, {
      isPublished: false,
    });
  }

  /**
   * Get course count by status
   * @returns {Promise<Object>}
   */
  async getCountByStatus() {
    const result = await this.db
      .select({
        isPublished: courses.isPublished,
        count: sql`COUNT(*)`,
      })
      .from(courses)
      .groupBy(courses.isPublished);
    
    return result.reduce((acc, row) => {
      acc[row.isPublished ? 'published' : 'draft'] = Number(row.count);
      return acc;
    }, { published: 0, draft: 0 });
  }
}

export default new CourseRepository();
