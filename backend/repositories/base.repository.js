/**
 * Base Repository
 * Provides common database operations for all repositories
 */

import { db } from '../db/index.js';

export class BaseRepository {
  constructor(table) {
    this.table = table;
    this.db = db;
  }

  /**
   * Find all records
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findAll(options = {}) {
    const { where, orderBy, limit, offset } = options;
    
    let query = this.db.select().from(this.table);
    
    if (where) {
      query = query.where(where);
    }
    
    if (orderBy) {
      query = query.orderBy(orderBy);
    }
    
    if (limit) {
      query = query.limit(limit);
    }
    
    if (offset) {
      query = query.offset(offset);
    }
    
    return await query;
  }

  /**
   * Find record by ID
   * @param {string} id - Record ID
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    const results = await this.db
      .select()
      .from(this.table)
      .where(eq(this.table.id, id))
      .limit(1);
    
    return results[0] || null;
  }

  /**
   * Find one record by criteria
   * @param {Object} where - Where clause
   * @returns {Promise<Object|null>}
   */
  async findOne(where) {
    const results = await this.db
      .select()
      .from(this.table)
      .where(where)
      .limit(1);
    
    return results[0] || null;
  }

  /**
   * Create a new record
   * @param {Object} data - Record data
   * @returns {Promise<Object>}
   */
  async create(data) {
    const now = new Date();
    const recordData = {
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    
    await this.db.insert(this.table).values(recordData).execute();
    
    return await this.findById(recordData.id);
  }

  /**
   * Update a record
   * @param {string} id - Record ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>}
   */
  async update(id, data) {
    const updateData = {
      ...data,
      updatedAt: new Date(),
    };
    
    await this.db
      .update(this.table)
      .set(updateData)
      .where(eq(this.table.id, id))
      .execute();
    
    return await this.findById(id);
  }

  /**
   * Delete a record
   * @param {string} id - Record ID
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    await this.db
      .delete(this.table)
      .where(eq(this.table.id, id))
      .execute();
    
    return true;
  }

  /**
   * Soft delete a record
   * @param {string} id - Record ID
   * @returns {Promise<Object>}
   */
  async softDelete(id) {
    return await this.update(id, { deletedAt: new Date() });
  }

  /**
   * Count records
   * @param {Object} where - Where clause
   * @returns {Promise<number>}
   */
  async count(where) {
    let query = this.db.select({ count: sql`COUNT(*)` }).from(this.table);
    
    if (where) {
      query = query.where(where);
    }
    
    const result = await query;
    return result[0]?.count || 0;
  }

  /**
   * Check if record exists
   * @param {Object} where - Where clause
   * @returns {Promise<boolean>}
   */
  async exists(where) {
    const count = await this.count(where);
    return count > 0;
  }
}

export default BaseRepository;
