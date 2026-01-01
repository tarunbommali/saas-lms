/**
 * Quiz Repository
 * Handles quiz data access
 */

import { eq, and } from 'drizzle-orm';
import { quizzes, quizQuestions, quizAttempts } from '../db/schema.js';
import { BaseRepository } from './base.repository.js';
import { db } from '../db/index.js';

export class QuizRepository extends BaseRepository {
  constructor() {
    super(quizzes);
  }

  /**
   * Find quiz by module
   * @param {string} moduleId - Module ID
   * @returns {Promise<Object|null>}
   */
  async findByModule(moduleId) {
    const [quiz] = await this.db
      .select()
      .from(quizzes)
      .where(eq(quizzes.moduleId, moduleId))
      .limit(1);
    
    return quiz || null;
  }

  /**
   * Find quiz with questions
   * @param {string} quizId - Quiz ID
   * @returns {Promise<Object|null>}
   */
  async findWithQuestions(quizId) {
    const [quiz] = await this.db
      .select()
      .from(quizzes)
      .where(eq(quizzes.id, quizId))
      .limit(1);
    
    if (!quiz) return null;
    
    const questions = await this.db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quizId))
      .execute();
    
    return { ...quiz, questions };
  }

  /**
   * Create quiz with questions
   * @param {Object} quizData - Quiz data
   * @param {Array} questions - Questions array
   * @returns {Promise<Object>}
   */
  async createWithQuestions(quizData, questions) {
    // Create quiz
    await this.db.insert(quizzes).values(quizData).execute();
    
    // Create questions
    if (questions && questions.length > 0) {
      await this.db.insert(quizQuestions).values(questions).execute();
    }
    
    return await this.findWithQuestions(quizData.id);
  }

  /**
   * Update quiz questions
   * @param {string} quizId - Quiz ID
   * @param {Array} questions - New questions array
   * @returns {Promise<Object>}
   */
  async updateQuestions(quizId, questions) {
    // Delete existing questions
    await this.db
      .delete(quizQuestions)
      .where(eq(quizQuestions.quizId, quizId))
      .execute();
    
    // Insert new questions
    if (questions && questions.length > 0) {
      await this.db.insert(quizQuestions).values(questions).execute();
    }
    
    return await this.findWithQuestions(quizId);
  }

  /**
   * Get user attempts for quiz
   * @param {string} quizId - Quiz ID
   * @param {string} userId - User ID
   * @returns {Promise<Array>}
   */
  async getUserAttempts(quizId, userId) {
    return await this.db
      .select()
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.quizId, quizId),
          eq(quizAttempts.userId, userId)
        )
      )
      .orderBy(desc(quizAttempts.attemptedAt))
      .execute();
  }

  /**
   * Get best attempt score
   * @param {string} quizId - Quiz ID
   * @param {string} userId - User ID
   * @returns {Promise<number>}
   */
  async getBestScore(quizId, userId) {
    const [result] = await this.db
      .select({
        bestScore: sql`MAX(${quizAttempts.score})`,
      })
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.quizId, quizId),
          eq(quizAttempts.userId, userId)
        )
      );
    
    return result?.bestScore || 0;
  }

  /**
   * Create quiz attempt
   * @param {Object} attemptData - Attempt data
   * @returns {Promise<Object>}
   */
  async createAttempt(attemptData) {
    await this.db.insert(quizAttempts).values(attemptData).execute();
    
    const [attempt] = await this.db
      .select()
      .from(quizAttempts)
      .where(eq(quizAttempts.id, attemptData.id))
      .limit(1);
    
    return attempt;
  }

  /**
   * Check if user passed quiz
   * @param {string} quizId - Quiz ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>}
   */
  async hasUserPassed(quizId, userId) {
    const [quiz] = await this.db
      .select()
      .from(quizzes)
      .where(eq(quizzes.id, quizId))
      .limit(1);
    
    if (!quiz) return false;
    
    const bestScore = await this.getBestScore(quizId, userId);
    return bestScore >= quiz.passingScore;
  }
}

export default new QuizRepository();
