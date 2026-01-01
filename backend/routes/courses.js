/* eslint-disable no-console */
import { Router } from 'express';
import { randomUUID } from 'crypto';
import { db } from '../db/index.js';
import { courses } from '../db/schema.js';
import { and, eq, ilike, desc } from 'drizzle-orm';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { validateBody, validateUUID } from '../middleware/validation.middleware.js';
import { CreateCourseDTO, UpdateCourseDTO } from '../dto/index.js';

const router = Router();

const ensureArray = (value) => (Array.isArray(value) ? value : []);

const compactObject = (obj) => Object.fromEntries(
  Object.entries(obj).filter(([, value]) => value !== undefined)
);

const toTrimmedString = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => toTrimmedString(item))
      .filter(Boolean)
      .join(', ')
      .trim();
  }
  if (typeof value === 'object') {
    return Object.values(value)
      .map((item) => toTrimmedString(item))
      .filter(Boolean)
      .join(' ')
      .trim();
  }
  return '';
};

const sanitizeResources = (resources) =>
  ensureArray(resources)
    .map((resource) => {
      if (!resource || typeof resource !== 'object') {
        return null;
      }

      const sanitized = { ...resource };
      sanitized.id = toTrimmedString(sanitized.id) || randomUUID();
      sanitized.type = toTrimmedString(sanitized.type) || 'document';
      if (sanitized.title !== undefined) {
        sanitized.title = toTrimmedString(sanitized.title) || null;
      }
      if (sanitized.description !== undefined) {
        sanitized.description = toTrimmedString(sanitized.description) || null;
      }
      if (sanitized.url !== undefined) {
        const url = toTrimmedString(sanitized.url);
        sanitized.url = url || null;
      }
      delete sanitized.file;

      return compactObject(sanitized);
    })
    .filter(Boolean);

const sanitizeDurationValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value).trim() || null : null;
  }

  if (typeof value === 'boolean') {
    return value ? '1' : '0';
  }

  if (Array.isArray(value) || typeof value === 'object') {
    const flattened = toTrimmedString(value);
    return flattened || null;
  }

  try {
    return String(value).trim() || null;
  } catch {
    return null;
  }
};

const sanitizeLessons = (lessons) =>
  ensureArray(lessons)
    .map((lesson, index) => {
      if (!lesson || typeof lesson !== 'object') {
        return null;
      }

      const sanitized = { ...lesson };
      sanitized.id = toTrimmedString(sanitized.id) || randomUUID();
      sanitized.title = sanitized.title !== undefined ? toTrimmedString(sanitized.title) || '' : '';
      if (sanitized.summary !== undefined) {
        sanitized.summary = toTrimmedString(sanitized.summary) || null;
      }
      if (sanitized.description !== undefined) {
        sanitized.description = toTrimmedString(sanitized.description) || null;
      }
      if (sanitized.duration !== undefined) {
        sanitized.duration = sanitizeDurationValue(sanitized.duration);
      }
      if (sanitized.type !== undefined) {
        sanitized.type = toTrimmedString(sanitized.type) || 'video';
      } else {
        sanitized.type = 'video';
      }
      if (sanitized.content !== undefined) {
        sanitized.content = toTrimmedString(sanitized.content) || null;
      }
      const order = coerceInt(sanitized.order, index + 1);
      sanitized.order = order > 0 ? order : index + 1;
      sanitized.resources = sanitizeResources(sanitized.resources);

      return compactObject(sanitized);
    })
    .filter(Boolean);

const sanitizeModules = (modules) =>
  ensureArray(modules)
    .map((module, index) => {
      if (!module || typeof module !== 'object') {
        return null;
      }

      const sanitized = { ...module };
      sanitized.id = toTrimmedString(sanitized.id) || randomUUID();
      sanitized.title = sanitized.title !== undefined ? toTrimmedString(sanitized.title) || '' : '';
      if (sanitized.description !== undefined) {
        sanitized.description = toTrimmedString(sanitized.description) || null;
      }
      if (sanitized.summary !== undefined) {
        sanitized.summary = toTrimmedString(sanitized.summary) || null;
      }
      if (sanitized.duration !== undefined) {
        sanitized.duration = sanitizeDurationValue(sanitized.duration);
      }
      const order = coerceInt(sanitized.order, index + 1);
      sanitized.order = order > 0 ? order : index + 1;
      sanitized.lessons = sanitizeLessons(sanitized.lessons);

      if (sanitized.resources !== undefined) {
        sanitized.resources = sanitizeResources(sanitized.resources);
      }

      return compactObject(sanitized);
    })
    .filter(Boolean);

const coerceInt = (value, fallback = 0) => {
  if (value === null || value === undefined || value === '') return fallback;
  const numericValue = Number.parseInt(value, 10);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const coerceNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === '') return fallback;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const normalizeCourseInput = (input = {}, { isNew = false, userId } = {}) => {
  const now = new Date();
  const normalized = {
    updatedAt: now,
  };

  if (input.title !== undefined) {
    const title = toTrimmedString(input.title);
    normalized.title = title || '';
  } else if (isNew) {
    normalized.title = '';
  }

  if (input.description !== undefined) {
    const description = toTrimmedString(input.description);
    normalized.description = description || null;
  } else if (isNew) {
    normalized.description = null;
  }

  if (input.shortDescription !== undefined) {
    const shortDescription = toTrimmedString(input.shortDescription);
    normalized.shortDescription = shortDescription || null;
  } else if (isNew) {
    normalized.shortDescription = null;
  }

  if (input.category !== undefined) {
    const category = toTrimmedString(input.category);
    normalized.category = category || null;
  } else if (isNew) {
    normalized.category = null;
  }

  if (input.instructor !== undefined) {
    const instructor = toTrimmedString(input.instructor);
    normalized.instructor = instructor || null;
  } else if (isNew) {
    normalized.instructor = null;
  }

  if (input.instructorBio !== undefined) {
    const instructorBio = toTrimmedString(input.instructorBio);
    normalized.instructorBio = instructorBio || null;
  }

  if (input.duration !== undefined) {
    normalized.duration = sanitizeDurationValue(input.duration);
  } else if (isNew) {
    normalized.duration = null;
  }

  if (input.difficulty !== undefined || input.level !== undefined) {
    const difficultySource = input.difficulty ?? input.level;
    const difficulty = toTrimmedString(difficultySource);
    normalized.difficulty = difficulty || 'beginner';
  } else if (isNew) {
    normalized.difficulty = 'beginner';
  }

  if (input.language !== undefined) {
    const language = toTrimmedString(input.language);
    normalized.language = language || 'English';
  } else if (isNew) {
    normalized.language = 'English';
  }

  if (input.price !== undefined) {
    normalized.price = coerceInt(input.price, 0);
  } else if (isNew) {
    normalized.price = 0;
  }

  if (input.currency !== undefined) {
    const currency = toTrimmedString(input.currency);
    normalized.currency = currency || 'INR';
  } else if (isNew) {
    normalized.currency = 'INR';
  }

  if (input.originalPrice !== undefined) {
    if (input.originalPrice === '' || input.originalPrice === null) {
      normalized.originalPrice = null;
    } else {
      normalized.originalPrice = coerceInt(input.originalPrice, 0);
    }
  }

  if (input.isPublished !== undefined) {
    normalized.isPublished = Boolean(input.isPublished);
  } else if (isNew) {
    normalized.isPublished = false;
  }

  if (input.isFeatured !== undefined) {
    normalized.isFeatured = Boolean(input.isFeatured);
  } else if (isNew) {
    normalized.isFeatured = false;
  }

  if (input.isBestseller !== undefined) {
    normalized.isBestseller = Boolean(input.isBestseller);
  } else if (isNew) {
    normalized.isBestseller = false;
  }

  const resolvedThumbnail = input.thumbnail ?? input.imageUrl ?? input.thumbnailUrl;
  if (resolvedThumbnail !== undefined) {
    const thumbnail = toTrimmedString(resolvedThumbnail);
    normalized.thumbnail = thumbnail || null;
  }

  const resolvedBanner = input.bannerImage ?? input.heroImage ?? null;
  if (resolvedBanner !== null || input.bannerImage !== undefined || input.heroImage !== undefined) {
    const banner = toTrimmedString(resolvedBanner);
    normalized.bannerImage = banner || null;
  }

  const resolvedPreview = input.previewVideo ?? input.videoUrl ?? input.previewVideoUrl;
  if (resolvedPreview !== undefined) {
    const preview = toTrimmedString(resolvedPreview);
    normalized.previewVideo = preview || null;
  }

  if (input.tags !== undefined) {
    normalized.tags = ensureArray(input.tags);
  }

  if (input.requirements !== undefined) {
    normalized.requirements = ensureArray(input.requirements);
  }

  if (input.whatYouLearn !== undefined) {
    normalized.whatYouLearn = ensureArray(input.whatYouLearn);
  }

  if (input.modules !== undefined) {
    normalized.modules = sanitizeModules(input.modules);
  }

  if (input.contentAccessURL !== undefined) {
    const accessUrl = toTrimmedString(input.contentAccessURL);
    normalized.contentAccessURL = accessUrl || null;
  }

  const contentDescriptionSource = input.contentDescription ?? input.courseDescription;
  if (contentDescriptionSource !== undefined) {
    const contentDescription = toTrimmedString(contentDescriptionSource);
    normalized.contentDescription = contentDescription || null;
  }

  if (input.status !== undefined) {
    const status = toTrimmedString(input.status);
    normalized.status = status || null;
  }

  if (!normalized.status && normalized.isPublished !== undefined) {
    normalized.status = normalized.isPublished ? 'published' : 'draft';
  } else if (isNew && !normalized.status) {
    normalized.status = 'draft';
  }

  if (input.contentType !== undefined) {
    const contentType = toTrimmedString(input.contentType);
    normalized.contentType = contentType || 'modules';
  } else if (isNew) {
    normalized.contentType = 'modules';
  }

  if (input.totalEnrollments !== undefined) {
    normalized.totalEnrollments = coerceInt(input.totalEnrollments, 0);
  }

  if (input.averageRating !== undefined) {
    normalized.averageRating = coerceNumber(input.averageRating, 0);
  }

  if (input.totalRatings !== undefined) {
    normalized.totalRatings = coerceInt(input.totalRatings, 0);
  }

  if (input.metaDescription !== undefined) {
    const metaDescription = toTrimmedString(input.metaDescription);
    normalized.metaDescription = metaDescription || null;
  }

  if (input.slug !== undefined) {
    const slug = toTrimmedString(input.slug);
    normalized.slug = slug || null;
  }

  if (isNew) {
    normalized.createdAt = input.createdAt ? new Date(input.createdAt) : now;
    normalized.createdBy = input.createdBy || userId || null;
  } else {
    if (input.createdAt !== undefined) {
      normalized.createdAt = input.createdAt ? new Date(input.createdAt) : null;
    }
    if (input.createdBy !== undefined) {
      normalized.createdBy = input.createdBy || null;
    }
  }

  if (normalized.createdAt && !(normalized.createdAt instanceof Date)) {
    normalized.createdAt = new Date(normalized.createdAt);
  }

  if (!(normalized.updatedAt instanceof Date)) {
    normalized.updatedAt = new Date(normalized.updatedAt || Date.now());
  }

  return Object.fromEntries(
    Object.entries(normalized).filter(([, value]) => value !== undefined)
  );
};

router.get('/', async (req, res) => {
  try {
    const { category, featured, q, limit, includeDrafts } = req.query || {};

    const conditions = [];
    if (!includeDrafts) {
      conditions.push(eq(courses.isPublished, true));
    }
    if (category) {
      conditions.push(ilike(courses.category, `%${category}%`));
    }
    if (featured) {
      conditions.push(eq(courses.isFeatured, String(featured).toLowerCase() === 'true'));
    }
    if (q) {
      conditions.push(ilike(courses.title, `%${q}%`));
    }

    let query = db.select().from(courses).orderBy(desc(courses.createdAt));
    if (conditions.length === 1) {
      query = query.where(conditions[0]);
    } else if (conditions.length > 1) {
      query = query.where(and(...conditions));
    }

    const numericLimit = Number.parseInt(limit, 10);
    if (Number.isFinite(numericLimit) && numericLimit > 0) {
      query = query.limit(numericLimit);
    }

    const allCourses = await query;
    res.json(allCourses);
  } catch (error) {
    if (error?.code === 'ER_NO_SUCH_TABLE') {
      console.warn('Courses table missing; returning empty list');
      return res.json([]);
    }
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

router.get('/admin', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { category, status, featured, q, limit } = req.query || {};
    const conditions = [];

    if (category) {
      conditions.push(ilike(courses.category, `%${category}%`));
    }
    if (status) {
      const normalized = String(status).toLowerCase();
      if (normalized === 'published') {
        conditions.push(eq(courses.isPublished, true));
      } else if (normalized === 'draft') {
        conditions.push(eq(courses.isPublished, false));
      } else {
        conditions.push(eq(courses.status, status));
      }
    }
    if (featured) {
      conditions.push(eq(courses.isFeatured, String(featured).toLowerCase() === 'true'));
    }
    if (q) {
      conditions.push(ilike(courses.title, `%${q}%`));
    }

    let query = db.select().from(courses).orderBy(desc(courses.createdAt));
    if (conditions.length === 1) {
      query = query.where(conditions[0]);
    } else if (conditions.length > 1) {
      query = query.where(and(...conditions));
    }

    const numericLimit = Number.parseInt(limit, 10);
    if (Number.isFinite(numericLimit) && numericLimit > 0) {
      query = query.limit(numericLimit);
    }

    const allCourses = await query;
    res.json(allCourses);
  } catch (error) {
    if (error?.code === 'ER_NO_SUCH_TABLE') {
      console.warn('Courses table missing; returning empty list for admin view');
      return res.json([]);
    }
    console.error('Get admin courses error:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [course] = await db.select().from(courses).where(eq(courses.id, req.params.id)).limit(1);
    
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json(course);
  } catch (error) {
    if (error?.code === 'ER_NO_SUCH_TABLE') {
      console.warn('Courses table missing; returning 404 for course lookup');
      return res.status(404).json({ error: 'Course not found' });
    }
    console.error('Get course error:', error);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const normalizedInput = normalizeCourseInput(req.body, {
      isNew: true,
      userId: req.user?.id,
    });

    if (!normalizedInput.title) {
      return res.status(400).json({ error: 'Course title is required' });
    }

    const courseId = req.body?.id || randomUUID();

    await db.insert(courses).values({
      id: courseId,
      ...normalizedInput,
    }).execute();

    const [newCourse] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
    res.status(201).json({
      message: 'Course created successfully',
      course: newCourse,
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [existingCourse] = await db.select().from(courses).where(eq(courses.id, req.params.id)).limit(1);

    if (!existingCourse) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const normalizedUpdates = normalizeCourseInput(req.body, {
      userId: req.user?.id,
    });

    if (!normalizedUpdates.title) {
      // Preserve existing title if not provided explicitly
      normalizedUpdates.title = existingCourse.title;
    }

    if (!normalizedUpdates.status) {
      normalizedUpdates.status = existingCourse.status;
    }

    await db.update(courses)
      .set(normalizedUpdates)
      .where(eq(courses.id, req.params.id))
      .execute();

    const [updatedCourse] = await db.select().from(courses).where(eq(courses.id, req.params.id)).limit(1);

    res.json({
      message: 'Course updated successfully',
      course: updatedCourse,
    });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ error: 'Failed to update course' });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [existingCourse] = await db.select().from(courses).where(eq(courses.id, req.params.id)).limit(1);

    if (!existingCourse) {
      return res.status(404).json({ error: 'Course not found' });
    }

    await db.delete(courses).where(eq(courses.id, req.params.id));
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

export default router;
