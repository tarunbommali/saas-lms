/**
 * Progress Service
 * Tracks user progress with gated learning logic
 */

import progressRepository from '../repositories/progress.repository.js';
import moduleRepository from '../repositories/module.repository.js';
import quizRepository from '../repositories/quiz.repository.js';
import enrollmentRepository from '../repositories/enrollment.repository.js';

export class ProgressService {
  /**
   * Get user progress for course
   * @param {string} userId - User ID
   * @param {string} courseId - Course ID
   * @returns {Promise<Object>}
   */
  async getCourseProgress(userId, courseId) {
    // Get all modules
    const modules = await moduleRepository.findPublishedByCourse(courseId);
    
    // Get user progress for all modules
    const progressData = await progressRepository.findByUserAndCourse(userId, courseId);
    const progressMap = new Map(progressData.map(p => [p.moduleId, p]));
    
    // Build progress structure with locking logic
    const modulesWithProgress = [];
    let previousModulePassed = true; // First module is always unlocked
    
    for (const module of modules) {
      const moduleProgress = progressMap.get(module.id) || {
        status: 'not_started',
        progress: 0,
        locked: false,
      };
      
      // Check if module has quiz
      const quiz = await quizRepository.findByModule(module.id);
      const hasQuiz = !!quiz;
      
      let quizPassed = false;
      let bestScore = 0;
      
      if (hasQuiz) {
        quizPassed = await quizRepository.hasUserPassed(quiz.id, userId);
        bestScore = await quizRepository.getBestScore(quiz.id, userId);
      }
      
      // Gated Logic: Lock if previous module not completed
      const isLocked = !previousModulePassed;
      
      modulesWithProgress.push({
        ...module,
        progress: {
          status: moduleProgress.status,
          progress: moduleProgress.progress,
          completedAt: moduleProgress.completedAt,
          locked: isLocked,
        },
        quiz: hasQuiz ? {
          id: quiz.id,
          passed: quizPassed,
          bestScore,
          required: true,
        } : null,
      });
      
      // Update previous module passed status
      if (hasQuiz) {
        previousModulePassed = quizPassed;
      } else {
        previousModulePassed = moduleProgress.status === 'completed';
      }
    }
    
    // Calculate overall course progress
    const stats = await progressRepository.getCourseStats(userId, courseId);
    const overallProgress = modules.length > 0 ? (stats.completed / modules.length) * 100 : 0;
    
    return {
      courseId,
      modules: modulesWithProgress,
      summary: {
        totalModules: modules.length,
        completedModules: stats.completed,
        overallProgress: Math.round(overallProgress),
        totalTimeSpent: stats.totalTimeSpent,
      },
    };
  }

  /**
   * Check if module is accessible (not locked)
   * @param {string} userId - User ID
   * @param {string} moduleId - Module ID
   * @returns {Promise<Object>}
   */
  async checkModuleAccess(userId, moduleId) {
    const module = await moduleRepository.findById(moduleId);
    if (!module) {
      throw new Error('Module not found');
    }
    
    // Get previous module
    const previousModule = await moduleRepository.getPreviousModule(
      module.courseId,
      module.orderIndex
    );
    
    // If no previous module, this is the first module - always accessible
    if (!previousModule) {
      return {
        accessible: true,
        reason: 'First module',
      };
    }
    
    // Check if previous module has quiz
    const previousQuiz = await quizRepository.findByModule(previousModule.id);
    
    if (previousQuiz) {
      // Previous module has quiz - must pass to unlock
      const hasPassed = await quizRepository.hasUserPassed(previousQuiz.id, userId);
      
      if (!hasPassed) {
        return {
          accessible: false,
          reason: `Complete and pass the quiz for "${previousModule.title}" to unlock this module`,
          requiredModule: previousModule,
        };
      }
    } else {
      // No quiz - just check if previous module is completed
      const previousProgress = await progressRepository.findByUserAndModule(
        userId,
        previousModule.id
      );
      
      if (!previousProgress || previousProgress.status !== 'completed') {
        return {
          accessible: false,
          reason: `Complete "${previousModule.title}" to unlock this module`,
          requiredModule: previousModule,
        };
      }
    }
    
    return {
      accessible: true,
      reason: 'All requirements met',
    };
  }

  /**
   * Update module progress
   * @param {string} userId - User ID
   * @param {string} moduleId - Module ID
   * @param {Object} progressData - Progress data
   * @returns {Promise<Object>}
   */
  async updateProgress(userId, moduleId, progressData) {
    // Check access
    const access = await this.checkModuleAccess(userId, moduleId);
    if (!access.accessible) {
      throw new Error(access.reason);
    }
    
    const module = await moduleRepository.findById(moduleId);
    
    return await progressRepository.upsert({
      userId,
      moduleId,
      courseId: module.courseId,
      progress: progressData.progress || 0,
      status: progressData.status || 'in_progress',
      timeSpentMinutes: progressData.timeSpentMinutes || 0,
      lastPosition: progressData.lastPosition || 0,
    });
  }

  /**
   * Check if user can request certificate
   * @param {string} userId - User ID
   * @param {string} courseId - Course ID
   * @returns {Promise<Object>}
   */
  async canRequestCertificate(userId, courseId) {
    const progress = await this.getCourseProgress(userId, courseId);
    
    // Check if all modules completed
    const allCompleted = progress.summary.overallProgress === 100;
    
    if (!allCompleted) {
      return {
        eligible: false,
        reason: 'Not all modules completed',
        progress: progress.summary.overallProgress,
      };
    }
    
    // Check if all quizzes passed
    const failedQuizzes = progress.modules.filter(
      m => m.quiz && m.quiz.required && !m.quiz.passed
    );
    
    if (failedQuizzes.length > 0) {
      return {
        eligible: false,
        reason: 'Some required quizzes not passed',
        failedQuizzes: failedQuizzes.map(m => m.title),
      };
    }
    
    return {
      eligible: true,
      reason: 'All requirements met',
    };
  }

  /**
   * Get dashboard data
   * @param {string} userId - User ID
   * @returns {Promise<Object>}
   */
  async getDashboardData(userId) {
    // Get all user enrollments
    const enrollments = await enrollmentRepository.findByUser(userId, {});
    
    // Get progress for each enrollment
    const coursesWithProgress = await Promise.all(
      enrollments.map(async ({ enrollment, course }) => {
        const progress = await this.getCourseProgress(userId, course.id);
        
        return {
          enrollment,
          course,
          progress: progress.summary,
          nextModule: progress.modules.find(m => !m.progress.locked && m.progress.status !== 'completed'),
        };
      })
    );
    
    // Calculate overall stats
    const totalCourses = coursesWithProgress.length;
    const completedCourses = coursesWithProgress.filter(
      c => c.progress.overallProgress === 100
    ).length;
    const inProgressCourses = totalCourses - completedCourses;
    
    return {
      totalCourses,
      completedCourses,
      inProgressCourses,
      courses: coursesWithProgress,
    };
  }
}

export default new ProgressService();
