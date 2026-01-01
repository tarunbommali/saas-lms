/* eslint-disable no-console */
import { Router } from 'express';
import { randomUUID } from 'crypto';
import { and, eq, asc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { 
  userModuleProgress, 
  userLessonProgress,
  courseModules,
  moduleLessons,
  enrollments,
  courses,
  certifications,
  quizzes,
  quizAttempts,
} from '../db/schema.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

/**
 * Get complete progress for a course
 * GET /api/learning-progress/:courseId
 */
router.get('/:courseId', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;
    
    // Check enrollment
    const [enrollment] = await db
      .select()
      .from(enrollments)
      .where(and(
        eq(enrollments.userId, userId),
        eq(enrollments.courseId, courseId)
      ));
    
    if (!enrollment) {
      return res.status(403).json({ error: 'You are not enrolled in this course' });
    }
    
    // Get all modules for the course
    const modules = await db
      .select()
      .from(courseModules)
      .where(eq(courseModules.courseId, courseId))
      .orderBy(asc(courseModules.orderIndex));
    
    // Get user's module progress
    const moduleProgress = await db
      .select()
      .from(userModuleProgress)
      .where(and(
        eq(userModuleProgress.userId, userId),
        eq(userModuleProgress.courseId, courseId)
      ));
    
    // Create a map for quick lookup
    const progressMap = new Map(moduleProgress.map(p => [p.moduleId, p]));
    
    // Calculate overall progress
    let totalCompleted = 0;
    let totalModules = modules.length;
    
    const moduleDetails = await Promise.all(modules.map(async (module, index) => {
      const progress = progressMap.get(module.id);
      
      // Get lessons for this module
      const lessons = await db
        .select()
        .from(moduleLessons)
        .where(eq(moduleLessons.moduleId, module.id))
        .orderBy(asc(moduleLessons.orderIndex));
      
      // Get lesson progress
      const lessonProgress = await db
        .select()
        .from(userLessonProgress)
        .where(and(
          eq(userLessonProgress.userId, userId),
          eq(userLessonProgress.moduleId, module.id)
        ));
      
      const lessonProgressMap = new Map(lessonProgress.map(p => [p.lessonId, p]));
      
      // Get quizzes for this module
      const moduleQuizzes = await db
        .select()
        .from(quizzes)
        .where(eq(quizzes.moduleId, module.id));
      
      // Determine if module is unlocked
      let isUnlocked = index === 0; // First module is always unlocked
      if (index > 0 && module.requiresPreviousCompletion) {
        const previousModule = modules[index - 1];
        const previousProgress = progressMap.get(previousModule.id);
        
        // Check if previous module's quiz was passed (if required)
        const previousQuizzes = await db
          .select()
          .from(quizzes)
          .where(and(
            eq(quizzes.moduleId, previousModule.id),
            eq(quizzes.isRequired, true)
          ));
        
        if (previousQuizzes.length > 0) {
          // Need to pass quiz to unlock
          isUnlocked = previousProgress?.quizPassed || false;
        } else {
          // Just need to complete module
          isUnlocked = previousProgress?.isCompleted || false;
        }
      } else if (!module.requiresPreviousCompletion) {
        isUnlocked = true;
      }
      
      if (progress?.isCompleted) {
        totalCompleted++;
      }
      
      return {
        module: {
          id: module.id,
          title: module.title,
          description: module.description,
          orderIndex: module.orderIndex,
          duration: module.duration,
          contentType: module.contentType,
          isFreePreview: module.isFreePreview,
          requiresPreviousCompletion: module.requiresPreviousCompletion,
          passingScore: module.passingScore,
        },
        progress: {
          status: progress?.status || 'not_started',
          progressPercentage: progress?.progressPercentage || 0,
          isUnlocked,
          isCompleted: progress?.isCompleted || false,
          completedAt: progress?.completedAt,
          lastAccessedAt: progress?.lastAccessedAt,
          timeSpentMinutes: progress?.timeSpentMinutes || 0,
          quizScore: progress?.quizScore,
          quizPassed: progress?.quizPassed || false,
          quizAttempts: progress?.quizAttempts || 0,
        },
        lessons: lessons.map(lesson => ({
          ...lesson,
          progress: lessonProgressMap.get(lesson.id) || {
            status: 'not_started',
            progressPercentage: 0,
            isCompleted: false,
          },
        })),
        quizzes: moduleQuizzes,
      };
    }));
    
    const overallProgress = totalModules > 0 
      ? Math.round((totalCompleted / totalModules) * 100) 
      : 0;
    
    res.json({
      courseId,
      enrollmentId: enrollment.id,
      overallProgress,
      modulesCompleted: totalCompleted,
      totalModules,
      modules: moduleDetails,
    });
  } catch (error) {
    console.error('Error fetching learning progress:', error);
    res.status(500).json({ error: 'Failed to fetch learning progress' });
  }
});

/**
 * Update module progress
 * PUT /api/learning-progress/module/:moduleId
 */
router.put('/module/:moduleId', authenticateToken, async (req, res) => {
  try {
    const { moduleId } = req.params;
    const userId = req.user.id;
    const { progressPercentage, timeSpentMinutes, status } = req.body;
    
    // Get module and verify enrollment
    const [module] = await db
      .select()
      .from(courseModules)
      .where(eq(courseModules.id, moduleId));
    
    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }
    
    const [enrollment] = await db
      .select()
      .from(enrollments)
      .where(and(
        eq(enrollments.userId, userId),
        eq(enrollments.courseId, module.courseId)
      ));
    
    if (!enrollment) {
      return res.status(403).json({ error: 'You are not enrolled in this course' });
    }
    
    // Get or create progress record
    let [progress] = await db
      .select()
      .from(userModuleProgress)
      .where(and(
        eq(userModuleProgress.userId, userId),
        eq(userModuleProgress.moduleId, moduleId)
      ));
    
    const now = new Date();
    const isCompleted = progressPercentage >= 100 || status === 'completed';
    
    if (progress) {
      // Update existing progress
      await db.update(userModuleProgress).set({
        progressPercentage: progressPercentage || progress.progressPercentage,
        status: status || (isCompleted ? 'completed' : 'in_progress'),
        isCompleted,
        completedAt: isCompleted && !progress.completedAt ? now : progress.completedAt,
        lastAccessedAt: now,
        timeSpentMinutes: (progress.timeSpentMinutes || 0) + (timeSpentMinutes || 0),
      }).where(eq(userModuleProgress.id, progress.id));
    } else {
      // Create new progress record
      const progressId = randomUUID();
      await db.insert(userModuleProgress).values({
        id: progressId,
        userId,
        courseId: module.courseId,
        moduleId,
        enrollmentId: enrollment.id,
        status: status || 'in_progress',
        progressPercentage: progressPercentage || 0,
        isUnlocked: true,
        isCompleted,
        completedAt: isCompleted ? now : null,
        lastAccessedAt: now,
        timeSpentMinutes: timeSpentMinutes || 0,
      });
    }
    
    // Update overall course progress
    await updateCourseProgress(userId, module.courseId, enrollment.id);
    
    // Get updated progress
    const [updatedProgress] = await db
      .select()
      .from(userModuleProgress)
      .where(and(
        eq(userModuleProgress.userId, userId),
        eq(userModuleProgress.moduleId, moduleId)
      ));
    
    res.json({
      message: 'Progress updated successfully',
      progress: updatedProgress,
    });
  } catch (error) {
    console.error('Error updating module progress:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

/**
 * Update lesson progress
 * PUT /api/learning-progress/lesson/:lessonId
 */
router.put('/lesson/:lessonId', authenticateToken, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user.id;
    const { progressPercentage, timeSpentMinutes, lastPosition, notes, status } = req.body;
    
    // Get lesson and module
    const [lesson] = await db
      .select()
      .from(moduleLessons)
      .where(eq(moduleLessons.id, lessonId));
    
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    
    const [module] = await db
      .select()
      .from(courseModules)
      .where(eq(courseModules.id, lesson.moduleId));
    
    // Verify enrollment
    const [enrollment] = await db
      .select()
      .from(enrollments)
      .where(and(
        eq(enrollments.userId, userId),
        eq(enrollments.courseId, module.courseId)
      ));
    
    if (!enrollment) {
      return res.status(403).json({ error: 'You are not enrolled in this course' });
    }
    
    // Get or create lesson progress
    let [progress] = await db
      .select()
      .from(userLessonProgress)
      .where(and(
        eq(userLessonProgress.userId, userId),
        eq(userLessonProgress.lessonId, lessonId)
      ));
    
    const now = new Date();
    const isCompleted = progressPercentage >= 100 || status === 'completed';
    
    if (progress) {
      await db.update(userLessonProgress).set({
        progressPercentage: progressPercentage || progress.progressPercentage,
        status: status || (isCompleted ? 'completed' : 'in_progress'),
        isCompleted,
        completedAt: isCompleted && !progress.completedAt ? now : progress.completedAt,
        lastAccessedAt: now,
        lastPosition: lastPosition || progress.lastPosition,
        timeSpentMinutes: (progress.timeSpentMinutes || 0) + (timeSpentMinutes || 0),
        notes: notes !== undefined ? notes : progress.notes,
      }).where(eq(userLessonProgress.id, progress.id));
    } else {
      const progressId = randomUUID();
      await db.insert(userLessonProgress).values({
        id: progressId,
        userId,
        moduleId: lesson.moduleId,
        lessonId,
        enrollmentId: enrollment.id,
        status: status || 'in_progress',
        progressPercentage: progressPercentage || 0,
        isCompleted,
        completedAt: isCompleted ? now : null,
        lastAccessedAt: now,
        lastPosition: lastPosition || 0,
        timeSpentMinutes: timeSpentMinutes || 0,
        notes,
      });
    }
    
    // Update module progress based on lesson completions
    await updateModuleProgress(userId, lesson.moduleId, enrollment.id, module.courseId);
    
    // Get updated progress
    const [updatedProgress] = await db
      .select()
      .from(userLessonProgress)
      .where(and(
        eq(userLessonProgress.userId, userId),
        eq(userLessonProgress.lessonId, lessonId)
      ));
    
    res.json({
      message: 'Lesson progress updated successfully',
      progress: updatedProgress,
    });
  } catch (error) {
    console.error('Error updating lesson progress:', error);
    res.status(500).json({ error: 'Failed to update lesson progress' });
  }
});

/**
 * Mark module as complete (manual completion)
 * POST /api/learning-progress/module/:moduleId/complete
 */
router.post('/module/:moduleId/complete', authenticateToken, async (req, res) => {
  try {
    const { moduleId } = req.params;
    const userId = req.user.id;
    
    const [module] = await db
      .select()
      .from(courseModules)
      .where(eq(courseModules.id, moduleId));
    
    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }
    
    // Check if quiz is required
    const requiredQuizzes = await db
      .select()
      .from(quizzes)
      .where(and(
        eq(quizzes.moduleId, moduleId),
        eq(quizzes.isRequired, true),
        eq(quizzes.isPublished, true)
      ));
    
    if (requiredQuizzes.length > 0) {
      // Check if user passed all required quizzes
      for (const quiz of requiredQuizzes) {
        const passedAttempt = await db
          .select()
          .from(quizAttempts)
          .where(and(
            eq(quizAttempts.quizId, quiz.id),
            eq(quizAttempts.userId, userId),
            eq(quizAttempts.passed, true)
          ));
        
        if (passedAttempt.length === 0) {
          return res.status(400).json({ 
            error: 'You must pass all required quizzes to complete this module',
            quizRequired: quiz.id,
          });
        }
      }
    }
    
    const [enrollment] = await db
      .select()
      .from(enrollments)
      .where(and(
        eq(enrollments.userId, userId),
        eq(enrollments.courseId, module.courseId)
      ));
    
    // Update or create progress
    let [progress] = await db
      .select()
      .from(userModuleProgress)
      .where(and(
        eq(userModuleProgress.userId, userId),
        eq(userModuleProgress.moduleId, moduleId)
      ));
    
    const now = new Date();
    
    if (progress) {
      await db.update(userModuleProgress).set({
        progressPercentage: 100,
        status: 'completed',
        isCompleted: true,
        completedAt: now,
      }).where(eq(userModuleProgress.id, progress.id));
    } else {
      const progressId = randomUUID();
      await db.insert(userModuleProgress).values({
        id: progressId,
        userId,
        courseId: module.courseId,
        moduleId,
        enrollmentId: enrollment?.id,
        status: 'completed',
        progressPercentage: 100,
        isUnlocked: true,
        isCompleted: true,
        completedAt: now,
        lastAccessedAt: now,
      });
    }
    
    // Update course progress
    await updateCourseProgress(userId, module.courseId, enrollment?.id);
    
    res.json({
      message: 'Module marked as complete',
      moduleId,
    });
  } catch (error) {
    console.error('Error completing module:', error);
    res.status(500).json({ error: 'Failed to complete module' });
  }
});

// Helper function to update module progress based on lessons
async function updateModuleProgress(userId, moduleId, enrollmentId, courseId) {
  const lessons = await db
    .select()
    .from(moduleLessons)
    .where(eq(moduleLessons.moduleId, moduleId));
  
  const lessonProgress = await db
    .select()
    .from(userLessonProgress)
    .where(and(
      eq(userLessonProgress.userId, userId),
      eq(userLessonProgress.moduleId, moduleId)
    ));
  
  const completedLessons = lessonProgress.filter(p => p.isCompleted).length;
  const progressPercentage = lessons.length > 0 
    ? Math.round((completedLessons / lessons.length) * 100)
    : 0;
  
  let [moduleProgress] = await db
    .select()
    .from(userModuleProgress)
    .where(and(
      eq(userModuleProgress.userId, userId),
      eq(userModuleProgress.moduleId, moduleId)
    ));
  
  const now = new Date();
  
  if (moduleProgress) {
    await db.update(userModuleProgress).set({
      progressPercentage,
      status: progressPercentage >= 100 ? 'completed' : 'in_progress',
      isCompleted: progressPercentage >= 100,
      completedAt: progressPercentage >= 100 && !moduleProgress.completedAt ? now : moduleProgress.completedAt,
      lastAccessedAt: now,
    }).where(eq(userModuleProgress.id, moduleProgress.id));
  } else {
    const progressId = randomUUID();
    await db.insert(userModuleProgress).values({
      id: progressId,
      userId,
      courseId,
      moduleId,
      enrollmentId,
      status: 'in_progress',
      progressPercentage,
      isUnlocked: true,
      isCompleted: false,
      lastAccessedAt: now,
    });
  }
  
  // Update overall course progress
  await updateCourseProgress(userId, courseId, enrollmentId);
}

// Helper function to update course progress
async function updateCourseProgress(userId, courseId, enrollmentId) {
  const modules = await db
    .select()
    .from(courseModules)
    .where(eq(courseModules.courseId, courseId));
  
  const moduleProgress = await db
    .select()
    .from(userModuleProgress)
    .where(and(
      eq(userModuleProgress.userId, userId),
      eq(userModuleProgress.courseId, courseId)
    ));
  
  const completedModules = moduleProgress.filter(p => p.isCompleted).length;
  const progressPercentage = modules.length > 0 
    ? Math.round((completedModules / modules.length) * 100)
    : 0;
  
  // Update enrollment progress
  if (enrollmentId) {
    await db.update(enrollments).set({
      progress: JSON.stringify({
        modulesCompleted: completedModules,
        totalModules: modules.length,
        completionPercentage: progressPercentage,
        lastAccessedAt: new Date().toISOString(),
      }),
    }).where(eq(enrollments.id, enrollmentId));
    
    // Check if course is completed
    if (progressPercentage >= 100) {
      await db.update(enrollments).set({
        status: 'COMPLETED',
        completedAt: new Date(),
        certificateDownloadable: true,
        certificateUnlockedAt: new Date(),
      }).where(eq(enrollments.id, enrollmentId));
      
      // Create certification if it doesn't exist
      const [existingCert] = await db
        .select()
        .from(certifications)
        .where(and(
          eq(certifications.userId, userId),
          eq(certifications.courseId, courseId)
        ));
      
      if (!existingCert) {
        const certId = randomUUID();
        await db.insert(certifications).values({
          id: certId,
          userId,
          courseId,
          enrollmentId,
          status: 'ISSUED',
          completionPercentage: 100,
          issuedAt: new Date(),
        });
      }
    }
  }
}

export default router;
