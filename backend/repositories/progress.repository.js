/**
 * Progress Repository
 * Handles user progress tracking data
 */

import { eq, and, sql } from 'drizzle-orm';
import { userProgress } from '../db/schema.js';
import { BaseRepository } from './base.repository.js';

export class ProgressRepository extends BaseRepository {
  constructor() {
    super(userProgress);
  }

  /**
   * Find progress by user and module
   * @param {string} userId - User ID
   * @param {string} moduleId - Module ID
   * @returns {Promise<Object|null>}
   */
  async findByUserAndModule(userId, moduleId) {
    const [progress] = await this.db
      .select()
      .from(userProgress)
      .where(
        and(
          eq(userProgress.userId, userId),
          eq(userProgress.moduleId, moduleId)
        )
      )
      .limit(1);
    
    return progress || null;
  }

  /**
   * Find all progress for user in course
   * @param {string} userId - User ID
   * @param {string} courseId - Course ID
   * @returns {Promise<Array>}
   */
  async findByUserAndCourse(userId, courseId) {
    return await this.db
      .select()
      .from(userProgress)
      .where(
        and(
          eq(userProgress.userId, userId),
          eq(userProgress.courseId, courseId)
        )
      )
      .execute();
  }

  /**
   * Update or create progress
   * @param {Object} progressData - Progress data
   * @returns {Promise<Object>}
   */
  async upsert(progressData) {
    const existing = await this.findByUserAndModule(
      progressData.userId,
      progressData.moduleId
    );
    
    if (existing) {
      return await this.update(existing.id, progressData);
    } else {
      return await this.create({
        ...progressData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  /**
   * Mark module as completed
   * @param {string} userId - User ID
   * @param {string} moduleId - Module ID
   * @param {Object} data - Additional data
   * @returns {Promise<Object>}
   */
  async markCompleted(userId, moduleId, data = {}) {
    return await this.upsert({
      userId,
      moduleId,
      courseId: data.courseId,
      status: 'completed',
      progress: 100,
      completedAt: new Date(),
      ...data,
    });
  }

  /**
   * Get course completion stats
   * @param {string} userId - User ID
   * @param {string} courseId - Course ID
   * @returns {Promise<Object>}
   */
  async getCourseStats(userId, courseId) {
    const [stats] = await this.db
      .select({
        total: sql`COUNT(*)`,
        completed: sql`SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)`,
        averageProgress: sql`AVG(progress)`,
        totalTimeSpent: sql`SUM(time_spent_minutes)`,
      })
      .from(userProgress)
      .where(
        and(
          eq(userProgress.userId, userId),
          eq(userProgress.courseId, courseId)
        )
      );
    
    return {
      total: Number(stats?.total || 0),
      completed: Number(stats?.completed || 0),
      averageProgress: Number(stats?.averageProgress || 0),
      totalTimeSpent: Number(stats?.totalTimeSpent || 0),
    };
  }
}

export default new ProgressRepository();
