/**
 * User Repository
 * Handles all database operations for users
 */

import { eq, and } from 'drizzle-orm';
import { users } from '../db/schema.js';
import { BaseRepository } from './base.repository.js';

export class UserRepository extends BaseRepository {
  constructor() {
    super(users);
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<Object|null>}
   */
  async findByEmail(email) {
    return await this.findOne(eq(users.email, email.toLowerCase().trim()));
  }

  /**
   * Find user by Google ID
   * @param {string} googleId - Google ID
   * @returns {Promise<Object|null>}
   */
  async findByGoogleId(googleId) {
    return await this.findOne(eq(users.googleId, googleId));
  }

  /**
   * Find active users
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findActive(options = {}) {
    return await this.findAll({
      ...options,
      where: eq(users.isActive, true),
    });
  }

  /**
   * Find admins
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findAdmins(options = {}) {
    return await this.findAll({
      ...options,
      where: and(eq(users.isAdmin, true), eq(users.isActive, true)),
    });
  }

  /**
   * Update password reset token
   * @param {string} userId - User ID
   * @param {string} token - Reset token
   * @param {Date} expiresAt - Token expiry
   * @returns {Promise<Object>}
   */
  async setPasswordResetToken(userId, token, expiresAt) {
    return await this.update(userId, {
      passwordResetToken: token,
      passwordResetExpires: expiresAt,
    });
  }

  /**
   * Clear password reset token
   * @param {string} userId - User ID
   * @returns {Promise<Object>}
   */
  async clearPasswordResetToken(userId) {
    return await this.update(userId, {
      passwordResetToken: null,
      passwordResetExpires: null,
    });
  }

  /**
   * Update last login
   * @param {string} userId - User ID
   * @returns {Promise<Object>}
   */
  async updateLastLogin(userId) {
    return await this.update(userId, {
      lastLoginAt: new Date(),
    });
  }

  /**
   * Verify email
   * @param {string} userId - User ID
   * @returns {Promise<Object>}
   */
  async verifyEmail(userId) {
    return await this.update(userId, {
      emailVerified: true,
    });
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} profileData - Profile data
   * @returns {Promise<Object>}
   */
  async updateProfile(userId, profileData) {
    const allowedFields = [
      'firstName',
      'lastName',
      'displayName',
      'phone',
      'college',
      'gender',
      'dateOfBirth',
      'skills',
      'interests',
      'photoURL',
    ];
    
    const filteredData = Object.keys(profileData)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = profileData[key];
        return obj;
      }, {});
    
    return await this.update(userId, filteredData);
  }

  /**
   * Search users
   * @param {string} query - Search query
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async search(query, options = {}) {
    const searchTerm = `%${query}%`;
    
    return await this.db
      .select()
      .from(users)
      .where(
        or(
          like(users.email, searchTerm),
          like(users.displayName, searchTerm),
          like(users.firstName, searchTerm),
          like(users.lastName, searchTerm)
        )
      )
      .limit(options.limit || 10)
      .offset(options.offset || 0);
  }

  /**
   * Get user statistics
   * @param {string} userId - User ID
   * @returns {Promise<Object>}
   */
  async getStatistics(userId) {
    const user = await this.findById(userId);
    
    if (!user) {
      return null;
    }
    
    return {
      totalEnrollments: user.totalCoursesEnrolled || 0,
      completedCourses: user.totalCoursesCompleted || 0,
      learningStreak: user.learningStreak || 0,
      joinedDate: user.createdAt,
      lastActive: user.lastLoginAt,
    };
  }
}

export default new UserRepository();
