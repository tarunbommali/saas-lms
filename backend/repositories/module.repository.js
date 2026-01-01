/**
 * Module Repository
 * Handles course module data access
 */

import { eq, and, asc, desc } from 'drizzle-orm';
import { courseModules } from '../db/schema.js';
import { BaseRepository } from './base.repository.js';

export class ModuleRepository extends BaseRepository {
  constructor() {
    super(courseModules);
  }

  /**
   * Find modules by course
   * @param {string} courseId - Course ID
   * @returns {Promise<Array>}
   */
  async findByCourse(courseId) {
    return await this.db
      .select()
      .from(courseModules)
      .where(eq(courseModules.courseId, courseId))
      .orderBy(asc(courseModules.orderIndex));
  }

  /**
   * Find published modules by course
   * @param {string} courseId - Course ID
   * @returns {Promise<Array>}
   */
  async findPublishedByCourse(courseId) {
    return await this.db
      .select()
      .from(courseModules)
      .where(
        and(
          eq(courseModules.courseId, courseId),
          eq(courseModules.isPublished, true)
        )
      )
      .orderBy(asc(courseModules.orderIndex));
  }

  /**
   * Find module by ID with course check
   * @param {string} moduleId - Module ID
   * @param {string} courseId - Course ID
   * @returns {Promise<Object|null>}
   */
  async findByIdAndCourse(moduleId, courseId) {
    const [module] = await this.db
      .select()
      .from(courseModules)
      .where(
        and(
          eq(courseModules.id, moduleId),
          eq(courseModules.courseId, courseId)
        )
      )
      .limit(1);
    
    return module || null;
  }

  /**
   * Get next module in sequence
   * @param {string} courseId - Course ID
   * @param {number} currentOrder - Current order index
   * @returns {Promise<Object|null>}
   */
  async getNextModule(courseId, currentOrder) {
    const [module] = await this.db
      .select()
      .from(courseModules)
      .where(
        and(
          eq(courseModules.courseId, courseId),
          eq(courseModules.isPublished, true),
          sql`${courseModules.orderIndex} > ${currentOrder}`
        )
      )
      .orderBy(asc(courseModules.orderIndex))
      .limit(1);
    
    return module || null;
  }

  /**
   * Get previous module in sequence
   * @param {string} courseId - Course ID
   * @param {number} currentOrder - Current order index
   * @returns {Promise<Object|null>}
   */
  async getPreviousModule(courseId, currentOrder) {
    const [module] = await this.db
      .select()
      .from(courseModules)
      .where(
        and(
          eq(courseModules.courseId, courseId),
          eq(courseModules.isPublished, true),
          sql`${courseModules.orderIndex} < ${currentOrder}`
        )
      )
      .orderBy(desc(courseModules.orderIndex))
      .limit(1);
    
    return module || null;
  }

  /**
   * Reorder modules
   * @param {string} courseId - Course ID
   * @param {Array} moduleOrders - Array of {id, orderIndex}
   * @returns {Promise<boolean>}
   */
  async reorderModules(courseId, moduleOrders) {
    for (const { id, orderIndex } of moduleOrders) {
      await this.db
        .update(courseModules)
        .set({ orderIndex, updatedAt: new Date() })
        .where(
          and(
            eq(courseModules.id, id),
            eq(courseModules.courseId, courseId)
          )
        )
        .execute();
    }
    return true;
  }

  /**
   * Count modules in course
   * @param {string} courseId - Course ID
   * @returns {Promise<number>}
   */
  async countByCourse(courseId) {
    return await this.count(eq(courseModules.courseId, courseId));
  }
}

export default new ModuleRepository();
