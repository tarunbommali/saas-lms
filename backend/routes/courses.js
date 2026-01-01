/* eslint-disable no-unused-vars */
/* eslint-disable no-console */
import { Router } from 'express';
import { randomUUID } from 'crypto';
import { db } from '../db/index.js';
import { courses, courseModules, moduleLessons, quizzes, quizQuestions } from '../db/schema.js';
import { and, eq, ilike, desc } from 'drizzle-orm';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { validateBody, validateUUID } from '../middleware/validation.middleware.js';
import { CreateCourseDTO, UpdateCourseDTO } from '../dto/index.js';

const router = Router();

const ensureArray = (value) => (Array.isArray(value) ? value : []);

const DEFAULT_QUIZ_POINTS = 5;

const compactObject = (obj) => Object.fromEntries(
  Object.entries(obj).filter(([, value]) => value !== undefined)
);

const isUuid = (value) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

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
      const resourceId = toTrimmedString(sanitized.id);
      sanitized.id = isUuid(resourceId) ? resourceId : randomUUID();
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

const toPositiveIntegerOrNull = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const numericValue = Number.parseInt(value, 10);
  return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : null;
};

const sanitizeQuizQuestions = (questions) =>
  ensureArray(questions)
    .map((question, index) => {
      if (!question || typeof question !== 'object') {
        return null;
      }

      const sanitized = { ...question };
      const questionId = toTrimmedString(sanitized.id);
      sanitized.id = isUuid(questionId) ? questionId : randomUUID();
      sanitized.questionText = sanitized.questionText !== undefined ? toTrimmedString(sanitized.questionText) || '' : '';

      const rawOptions = ensureArray(sanitized.options).map((option, optionIndex) => {
        const value = toTrimmedString(option);
        return value || `Option ${optionIndex + 1}`;
      });
      sanitized.options = rawOptions.length >= 2 ? rawOptions : [...rawOptions, `Option ${rawOptions.length + 1 || 1}`];

      const correctIndex = Number.isFinite(Number(sanitized.correctOptionIndex))
        ? Number(sanitized.correctOptionIndex)
        : 0;
      const boundedIndex = Math.min(Math.max(correctIndex, 0), sanitized.options.length - 1);
      sanitized.correctOptionIndex = boundedIndex;
      sanitized.correctAnswer = sanitized.options[boundedIndex];

      if (sanitized.explanation !== undefined) {
        sanitized.explanation = toTrimmedString(sanitized.explanation) || null;
      }

      const parsedPoints = Number.parseInt(sanitized.points, 10);
      sanitized.points = Number.isFinite(parsedPoints) && parsedPoints > 0 ? parsedPoints : DEFAULT_QUIZ_POINTS;
      sanitized.orderIndex = index + 1;

      return compactObject(sanitized);
    })
    .filter(Boolean);

const sanitizeQuiz = (quiz, lesson, lessonIndex) => {
  if (!quiz || typeof quiz !== 'object') {
    return null;
  }

  const sanitized = { ...quiz };
  const quizId = toTrimmedString(sanitized.id);
  sanitized.id = isUuid(quizId) ? quizId : randomUUID();
  sanitized.title = sanitized.title !== undefined ? toTrimmedString(sanitized.title) || `${lesson?.title || 'Lesson'} Quiz` : `${lesson?.title || 'Lesson'} Quiz`;
  if (sanitized.description !== undefined) {
    sanitized.description = toTrimmedString(sanitized.description) || null;
  }

  const passingScoreNumeric = Number.parseInt(sanitized.passingScore, 10);
  sanitized.passingScore = Number.isFinite(passingScoreNumeric)
    ? Math.min(Math.max(passingScoreNumeric, 0), 100)
    : 70;
  sanitized.timeLimit = toPositiveIntegerOrNull(sanitized.timeLimit);
  sanitized.maxAttempts = toPositiveIntegerOrNull(sanitized.maxAttempts);
  sanitized.shuffleQuestions = Boolean(sanitized.shuffleQuestions);
  sanitized.shuffleOptions = Boolean(sanitized.shuffleOptions);
  sanitized.showCorrectAnswers = sanitized.showCorrectAnswers === true;
  sanitized.showScore = sanitized.showScore !== false;
  sanitized.isRequired = sanitized.isRequired !== false;
  sanitized.isPublished = sanitized.isPublished !== false;

  sanitized.questions = sanitizeQuizQuestions(sanitized.questions);
  sanitized.totalQuestions = sanitized.questions.length;
  sanitized.totalPoints = sanitized.questions.length * DEFAULT_QUIZ_POINTS;
  sanitized.orderIndex = lessonIndex + 1;

  return compactObject(sanitized);
};

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
      const lessonId = toTrimmedString(sanitized.id);
      sanitized.id = isUuid(lessonId) ? lessonId : randomUUID();
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
      sanitized.quiz = sanitizeQuiz(lesson.quiz ?? sanitized.quiz, lesson, index);

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
      const moduleId = toTrimmedString(sanitized.id);
      sanitized.id = isUuid(moduleId) ? moduleId : randomUUID();
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

const syncCourseStructure = async (courseId, modulesData = [], { replaceExisting = false } = {}) => {
  if (!Array.isArray(modulesData) || modulesData.length === 0) {
    return;
  }

  await db.transaction(async (tx) => {
    if (replaceExisting) {
      await tx.delete(courseModules).where(eq(courseModules.courseId, courseId));
    }

    for (let moduleIndex = 0; moduleIndex < modulesData.length; moduleIndex += 1) {
      const moduleData = modulesData[moduleIndex] || {};
      const moduleId = isUuid(moduleData.id) ? moduleData.id : randomUUID();

      await tx.insert(courseModules).values({
        id: moduleId,
        courseId,
        title: moduleData.title || '',
        description: moduleData.description || null,
        summary: moduleData.summary || null,
        orderIndex: coerceInt(moduleData.order, moduleIndex + 1),
        duration: coerceInt(moduleData.duration, 0),
        contentType: toTrimmedString(moduleData.contentType) || 'video',
        contentUrl: toTrimmedString(moduleData.contentUrl ?? moduleData.content) || null,
        contentData: moduleData.contentData ? JSON.stringify(moduleData.contentData) : null,
        isFreePreview: Boolean(moduleData.isFreePreview),
        isPublished: moduleData.isPublished !== false,
        requiresPreviousCompletion: moduleData.requiresPreviousCompletion !== false,
        passingScore: coerceInt(moduleData.passingScore ?? moduleData?.quiz?.passingScore, 70),
        resources: JSON.stringify(moduleData.resources || []),
      });

      const lessons = Array.isArray(moduleData.lessons) ? moduleData.lessons : [];
      for (let lessonIndex = 0; lessonIndex < lessons.length; lessonIndex += 1) {
        const lessonData = lessons[lessonIndex] || {};
        const lessonId = isUuid(lessonData.id) ? lessonData.id : randomUUID();

        const resourcesPayload = Array.isArray(lessonData.resources) && lessonData.resources.length > 0
          ? { resources: lessonData.resources }
          : null;
        const serializedContentData = lessonData.contentData
          ? JSON.stringify(lessonData.contentData)
          : resourcesPayload
            ? JSON.stringify(resourcesPayload)
            : null;

        await tx.insert(moduleLessons).values({
          id: lessonId,
          moduleId,
          title: lessonData.title || '',
          description: lessonData.description || null,
          orderIndex: coerceInt(lessonData.order, lessonIndex + 1),
          duration: coerceInt(lessonData.duration, 0),
          contentType: toTrimmedString(lessonData.type) || 'video',
          contentUrl: toTrimmedString(lessonData.content) || null,
          contentData: serializedContentData,
          isFreePreview: Boolean(lessonData.isFreePreview),
          isPublished: lessonData.isPublished !== false,
        });

        const quizData = lessonData.quiz;
        const questions = Array.isArray(quizData?.questions) ? quizData.questions : [];
        if (quizData && questions.length > 0) {
          const quizId = isUuid(quizData.id) ? quizData.id : randomUUID();
          const totalPoints = questions.length * DEFAULT_QUIZ_POINTS;

          await tx.insert(quizzes).values({
            id: quizId,
            courseId,
            moduleId,
            lessonId,
            title: quizData.title || `${lessonData.title || 'Lesson'} Quiz`,
            description: quizData.description || null,
            instructions: quizData.instructions || null,
            passingScore: coerceInt(quizData.passingScore, 70),
            timeLimit: toPositiveIntegerOrNull(quizData.timeLimit),
            maxAttempts: toPositiveIntegerOrNull(quizData.maxAttempts),
            shuffleQuestions: Boolean(quizData.shuffleQuestions),
            shuffleOptions: Boolean(quizData.shuffleOptions),
            showCorrectAnswers: quizData.showCorrectAnswers === true,
            showScore: quizData.showScore !== false,
            isRequired: quizData.isRequired !== false,
            isPublished: quizData.isPublished !== false,
            orderIndex: coerceInt(quizData.orderIndex, lessonIndex + 1),
            totalQuestions: questions.length,
            totalPoints,
          });

          for (let questionIndex = 0; questionIndex < questions.length; questionIndex += 1) {
            const questionData = questions[questionIndex] || {};
            const questionId = isUuid(questionData.id) ? questionData.id : randomUUID();
            const options = ensureArray(questionData.options);
            const correctIndex = Number.isFinite(Number(questionData.correctOptionIndex))
              ? Number(questionData.correctOptionIndex)
              : options.findIndex((option) => option === questionData.correctAnswer);
            const boundedIndex = correctIndex >= 0 && correctIndex < options.length ? correctIndex : 0;
            const correctAnswer = typeof questionData.correctAnswer === 'string'
              ? questionData.correctAnswer
              : options[boundedIndex];

            await tx.insert(quizQuestions).values({
              id: questionId,
              quizId,
              questionText: questionData.questionText || '',
              questionType: toTrimmedString(questionData.questionType) || 'multiple_choice',
              options: JSON.stringify(options),
              correctAnswer: correctAnswer || '',
              explanation: questionData.explanation || null,
              points: coerceInt(questionData.points, DEFAULT_QUIZ_POINTS),
              orderIndex: coerceInt(questionData.orderIndex, questionIndex + 1),
              difficulty: toTrimmedString(questionData.difficulty) || 'medium',
              tags: JSON.stringify(questionData.tags || []),
              isActive: questionData.isActive !== false,
            });
          }
        }
      }
    }
  });
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

    if (Array.isArray(normalizedInput.modules) && normalizedInput.modules.length > 0) {
      await syncCourseStructure(courseId, normalizedInput.modules, { replaceExisting: true });
    }

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

    if (Array.isArray(normalizedUpdates.modules) && normalizedUpdates.modules.length > 0) {
      await syncCourseStructure(req.params.id, normalizedUpdates.modules, { replaceExisting: true });
    }

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
