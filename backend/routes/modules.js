/* eslint-disable no-console */
import { Router } from 'express';
import { randomUUID } from 'crypto';
import { and, eq, asc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { 
  courseModules, 
  moduleLessons, 
  courses 
} from '../db/schema.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

/**
 * Get all modules for a course
 * GET /api/modules/:courseId
 */
router.get('/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    
    const modules = await db
      .select()
      .from(courseModules)
      .where(eq(courseModules.courseId, courseId))
      .orderBy(asc(courseModules.orderIndex));
    
    // Get lessons for each module
    const modulesWithLessons = await Promise.all(
      modules.map(async (module) => {
        const lessons = await db
          .select()
          .from(moduleLessons)
          .where(eq(moduleLessons.moduleId, module.id))
          .orderBy(asc(moduleLessons.orderIndex));
        
        return {
          ...module,
          lessons,
        };
      })
    );
    
    res.json(modulesWithLessons);
  } catch (error) {
    console.error('Error fetching modules:', error);
    res.status(500).json({ error: 'Failed to fetch modules' });
  }
});

/**
 * Get a single module by ID
 * GET /api/modules/detail/:moduleId
 */
router.get('/detail/:moduleId', async (req, res) => {
  try {
    const { moduleId } = req.params;
    
    const [module] = await db
      .select()
      .from(courseModules)
      .where(eq(courseModules.id, moduleId));
    
    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }
    
    const lessons = await db
      .select()
      .from(moduleLessons)
      .where(eq(moduleLessons.moduleId, moduleId))
      .orderBy(asc(moduleLessons.orderIndex));
    
    res.json({ ...module, lessons });
  } catch (error) {
    console.error('Error fetching module:', error);
    res.status(500).json({ error: 'Failed to fetch module' });
  }
});

/**
 * Create a new module
 * POST /api/modules
 */
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      courseId,
      title,
      description,
      summary,
      orderIndex,
      durationMinutes,
      contentType,
      contentUrl,
      contentData,
      isFreePreview,
      isPublished,
      requiresPreviousCompletion,
      passingScore,
      resources,
    } = req.body;
    
    // Verify course exists
    const [course] = await db.select().from(courses).where(eq(courses.id, courseId));
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    // Get the next order index if not provided
    let newOrderIndex = orderIndex;
    if (!newOrderIndex) {
      const existingModules = await db
        .select()
        .from(courseModules)
        .where(eq(courseModules.courseId, courseId));
      newOrderIndex = existingModules.length + 1;
    }
    
    const moduleId = randomUUID();
    
    await db.insert(courseModules).values({
      id: moduleId,
      courseId,
      title,
      description,
      summary,
      orderIndex: newOrderIndex,
      duration: durationMinutes || 0,
      contentType: contentType || 'video',
      contentUrl,
      contentData: contentData ? JSON.stringify(contentData) : null,
      isFreePreview: isFreePreview || false,
      isPublished: isPublished || false,
      requiresPreviousCompletion: requiresPreviousCompletion !== false,
      passingScore: passingScore || 70,
      resources: resources ? JSON.stringify(resources) : '[]',
    });
    
    const [newModule] = await db.select().from(courseModules).where(eq(courseModules.id, moduleId));
    
    res.status(201).json({
      message: 'Module created successfully',
      module: newModule,
    });
  } catch (error) {
    console.error('Error creating module:', error);
    res.status(500).json({ error: 'Failed to create module' });
  }
});

/**
 * Update a module
 * PUT /api/modules/:moduleId
 */
router.put('/:moduleId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { moduleId } = req.params;
    const updates = req.body;
    
    const [existingModule] = await db.select().from(courseModules).where(eq(courseModules.id, moduleId));
    if (!existingModule) {
      return res.status(404).json({ error: 'Module not found' });
    }
    
    // Prepare updates
    const updateData = {};
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.summary !== undefined) updateData.summary = updates.summary;
    if (updates.orderIndex !== undefined) updateData.orderIndex = updates.orderIndex;
    if (updates.durationMinutes !== undefined) updateData.duration = updates.durationMinutes;
    if (updates.contentType !== undefined) updateData.contentType = updates.contentType;
    if (updates.contentUrl !== undefined) updateData.contentUrl = updates.contentUrl;
    if (updates.contentData !== undefined) updateData.contentData = JSON.stringify(updates.contentData);
    if (updates.isFreePreview !== undefined) updateData.isFreePreview = updates.isFreePreview;
    if (updates.isPublished !== undefined) updateData.isPublished = updates.isPublished;
    if (updates.requiresPreviousCompletion !== undefined) updateData.requiresPreviousCompletion = updates.requiresPreviousCompletion;
    if (updates.passingScore !== undefined) updateData.passingScore = updates.passingScore;
    if (updates.resources !== undefined) updateData.resources = JSON.stringify(updates.resources);
    
    await db.update(courseModules).set(updateData).where(eq(courseModules.id, moduleId));
    
    const [updatedModule] = await db.select().from(courseModules).where(eq(courseModules.id, moduleId));
    
    res.json({
      message: 'Module updated successfully',
      module: updatedModule,
    });
  } catch (error) {
    console.error('Error updating module:', error);
    res.status(500).json({ error: 'Failed to update module' });
  }
});

/**
 * Delete a module
 * DELETE /api/modules/:moduleId
 */
router.delete('/:moduleId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { moduleId } = req.params;
    
    const [existingModule] = await db.select().from(courseModules).where(eq(courseModules.id, moduleId));
    if (!existingModule) {
      return res.status(404).json({ error: 'Module not found' });
    }
    
    await db.delete(courseModules).where(eq(courseModules.id, moduleId));
    
    res.json({ message: 'Module deleted successfully' });
  } catch (error) {
    console.error('Error deleting module:', error);
    res.status(500).json({ error: 'Failed to delete module' });
  }
});

/**
 * Reorder modules
 * PUT /api/modules/reorder/:courseId
 */
router.put('/reorder/:courseId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { moduleOrder } = req.body; // Array of {moduleId, orderIndex}
    
    if (!Array.isArray(moduleOrder)) {
      return res.status(400).json({ error: 'moduleOrder must be an array' });
    }
    
    // Update order for each module
    await Promise.all(
      moduleOrder.map(({ moduleId, orderIndex }) =>
        db.update(courseModules)
          .set({ orderIndex })
          .where(and(eq(courseModules.id, moduleId), eq(courseModules.courseId, courseId)))
      )
    );
    
    const updatedModules = await db
      .select()
      .from(courseModules)
      .where(eq(courseModules.courseId, courseId))
      .orderBy(asc(courseModules.orderIndex));
    
    res.json({
      message: 'Modules reordered successfully',
      modules: updatedModules,
    });
  } catch (error) {
    console.error('Error reordering modules:', error);
    res.status(500).json({ error: 'Failed to reorder modules' });
  }
});

// =====================================================
// Lesson Routes
// =====================================================

/**
 * Get all lessons for a module
 * GET /api/modules/:moduleId/lessons
 */
router.get('/:moduleId/lessons', async (req, res) => {
  try {
    const { moduleId } = req.params;
    
    const lessons = await db
      .select()
      .from(moduleLessons)
      .where(eq(moduleLessons.moduleId, moduleId))
      .orderBy(asc(moduleLessons.orderIndex));
    
    res.json(lessons);
  } catch (error) {
    console.error('Error fetching lessons:', error);
    res.status(500).json({ error: 'Failed to fetch lessons' });
  }
});

/**
 * Create a lesson
 * POST /api/modules/:moduleId/lessons
 */
router.post('/:moduleId/lessons', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { moduleId } = req.params;
    const {
      title,
      description,
      orderIndex,
      durationMinutes,
      contentType,
      contentUrl,
      contentData,
      isFreePreview,
      isPublished,
    } = req.body;
    
    // Verify module exists
    const [module] = await db.select().from(courseModules).where(eq(courseModules.id, moduleId));
    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }
    
    // Get the next order index if not provided
    let newOrderIndex = orderIndex;
    if (!newOrderIndex) {
      const existingLessons = await db
        .select()
        .from(moduleLessons)
        .where(eq(moduleLessons.moduleId, moduleId));
      newOrderIndex = existingLessons.length + 1;
    }
    
    const lessonId = randomUUID();
    
    await db.insert(moduleLessons).values({
      id: lessonId,
      moduleId,
      title,
      description,
      orderIndex: newOrderIndex,
      duration: durationMinutes || 0,
      contentType: contentType || 'video',
      contentUrl,
      contentData: contentData ? JSON.stringify(contentData) : null,
      isFreePreview: isFreePreview || false,
      isPublished: isPublished || false,
    });
    
    const [newLesson] = await db.select().from(moduleLessons).where(eq(moduleLessons.id, lessonId));
    
    res.status(201).json({
      message: 'Lesson created successfully',
      lesson: newLesson,
    });
  } catch (error) {
    console.error('Error creating lesson:', error);
    res.status(500).json({ error: 'Failed to create lesson' });
  }
});

/**
 * Update a lesson
 * PUT /api/modules/lessons/:lessonId
 */
router.put('/lessons/:lessonId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const updates = req.body;
    
    const [existingLesson] = await db.select().from(moduleLessons).where(eq(moduleLessons.id, lessonId));
    if (!existingLesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    
    const updateData = {};
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.orderIndex !== undefined) updateData.orderIndex = updates.orderIndex;
    if (updates.durationMinutes !== undefined) updateData.duration = updates.durationMinutes;
    if (updates.contentType !== undefined) updateData.contentType = updates.contentType;
    if (updates.contentUrl !== undefined) updateData.contentUrl = updates.contentUrl;
    if (updates.contentData !== undefined) updateData.contentData = JSON.stringify(updates.contentData);
    if (updates.isFreePreview !== undefined) updateData.isFreePreview = updates.isFreePreview;
    if (updates.isPublished !== undefined) updateData.isPublished = updates.isPublished;
    
    await db.update(moduleLessons).set(updateData).where(eq(moduleLessons.id, lessonId));
    
    const [updatedLesson] = await db.select().from(moduleLessons).where(eq(moduleLessons.id, lessonId));
    
    res.json({
      message: 'Lesson updated successfully',
      lesson: updatedLesson,
    });
  } catch (error) {
    console.error('Error updating lesson:', error);
    res.status(500).json({ error: 'Failed to update lesson' });
  }
});

/**
 * Delete a lesson
 * DELETE /api/modules/lessons/:lessonId
 */
router.delete('/lessons/:lessonId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { lessonId } = req.params;
    
    const [existingLesson] = await db.select().from(moduleLessons).where(eq(moduleLessons.id, lessonId));
    if (!existingLesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    
    await db.delete(moduleLessons).where(eq(moduleLessons.id, lessonId));
    
    res.json({ message: 'Lesson deleted successfully' });
  } catch (error) {
    console.error('Error deleting lesson:', error);
    res.status(500).json({ error: 'Failed to delete lesson' });
  }
});

export default router;
