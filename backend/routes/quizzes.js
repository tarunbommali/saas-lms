/* eslint-disable no-console */
import { Router } from 'express';
import { randomUUID } from 'crypto';
import { and, eq, asc, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { 
  quizzes, 
  quizQuestions, 
  quizAttempts,
  courses,
  courseModules,
  moduleLessons,
  enrollments,
  userModuleProgress,
  userLessonProgress,
} from '../db/schema.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

const QUIZ_CORRECT_POINTS = 5;
const QUIZ_WRONG_PENALTY = 1;

// =====================================================
// Quiz Management (Admin)
// =====================================================

/**
 * Get all quizzes for a course
 * GET /api/quizzes/course/:courseId
 */
router.get('/course/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    
    const quizList = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.courseId, courseId))
      .orderBy(asc(quizzes.orderIndex));
    
    res.json(quizList);
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
});

/**
 * Get all quizzes for a module
 * GET /api/quizzes/module/:moduleId
 */
router.get('/module/:moduleId', async (req, res) => {
  try {
    const { moduleId } = req.params;
    
    const quizList = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.moduleId, moduleId))
      .orderBy(asc(quizzes.orderIndex));
    
    res.json(quizList);
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
});

/**
 * Get a single quiz with questions
 * GET /api/quizzes/:quizId
 */
router.get('/:quizId', authenticateToken, async (req, res) => {
  try {
    const { quizId } = req.params;
    
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
    
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    
    let questions = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quizId))
      .orderBy(asc(quizQuestions.orderIndex));
    
    // If user is not admin, hide correct answers
    if (!req.user.isAdmin) {
      questions = questions.map(q => ({
        ...q,
        correctAnswer: undefined, // Hide correct answer
        explanation: undefined,    // Hide explanation until after attempt
      }));
    }
    
    // Shuffle questions if enabled
    if (quiz.shuffleQuestions && !req.user.isAdmin) {
      questions = shuffleArray([...questions]);
    }
    
    // Shuffle options if enabled
    if (quiz.shuffleOptions && !req.user.isAdmin) {
      questions = questions.map(q => {
        if (q.options) {
          const opts = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
          return { ...q, options: shuffleArray([...opts]) };
        }
        return q;
      });
    }
    
    res.json({ ...quiz, questions });
  } catch (error) {
    console.error('Error fetching quiz:', error);
    res.status(500).json({ error: 'Failed to fetch quiz' });
  }
});

/**
 * Create a new quiz
 * POST /api/quizzes
 */
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      courseId,
      moduleId,
      lessonId,
      title,
      description,
      instructions,
      passingScore,
      timeLimitMinutes,
      maxAttempts,
      shuffleQuestions,
      shuffleOptions,
      showCorrectAnswers,
      showScore,
      isRequired,
      isPublished,
      orderIndex,
    } = req.body;
    
    // Verify course exists
    const [course] = await db.select().from(courses).where(eq(courses.id, courseId));
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    // Verify module exists if provided
    let resolvedModuleId = moduleId;
    if (moduleId) {
      const [module] = await db.select().from(courseModules).where(eq(courseModules.id, moduleId));
      if (!module) {
        return res.status(404).json({ error: 'Module not found' });
      }
      if (module.courseId !== courseId) {
        return res.status(400).json({ error: 'Module does not belong to the specified course' });
      }
      resolvedModuleId = module.id;
    }

    let resolvedLessonId = lessonId;
    if (lessonId) {
      const [lesson] = await db.select().from(moduleLessons).where(eq(moduleLessons.id, lessonId));
      if (!lesson) {
        return res.status(404).json({ error: 'Lesson not found' });
      }
      if (resolvedModuleId && lesson.moduleId !== resolvedModuleId) {
        return res.status(400).json({ error: 'Lesson does not belong to the specified module' });
      }
      resolvedLessonId = lesson.id;
      if (!resolvedModuleId) {
        const [lessonModule] = await db.select().from(courseModules).where(eq(courseModules.id, lesson.moduleId));
        if (!lessonModule || lessonModule.courseId !== courseId) {
          return res.status(400).json({ error: 'Lesson module does not belong to the specified course' });
        }
        resolvedModuleId = lesson.moduleId;
      }
    }
    
    const quizId = randomUUID();
    
    await db.insert(quizzes).values({
      id: quizId,
      courseId,
      moduleId: resolvedModuleId,
      lessonId: resolvedLessonId,
      title,
      description,
      instructions,
      passingScore: passingScore || 70,
      timeLimit: timeLimitMinutes,
      maxAttempts,
      shuffleQuestions: shuffleQuestions || false,
      shuffleOptions: shuffleOptions || false,
      showCorrectAnswers: showCorrectAnswers !== false,
      showScore: showScore !== false,
      isRequired: isRequired !== false,
      isPublished: isPublished || false,
      orderIndex: orderIndex || 1,
    });
    
    const [newQuiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
    
    res.status(201).json({
      message: 'Quiz created successfully',
      quiz: newQuiz,
    });
  } catch (error) {
    console.error('Error creating quiz:', error);
    res.status(500).json({ error: 'Failed to create quiz' });
  }
});

/**
 * Update a quiz
 * PUT /api/quizzes/:quizId
 */
router.put('/:quizId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { quizId } = req.params;
    const updates = req.body;
    
    const [existingQuiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
    if (!existingQuiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    
    const updateData = {};

    let resolvedModuleId = existingQuiz.moduleId;
    let resolvedLessonId = existingQuiz.lessonId;

    if (updates.moduleId !== undefined) {
      if (!updates.moduleId) {
        resolvedModuleId = null;
      } else {
        const [module] = await db.select().from(courseModules).where(eq(courseModules.id, updates.moduleId));
        if (!module) {
          return res.status(404).json({ error: 'Module not found' });
        }
        if (module.courseId !== existingQuiz.courseId) {
          return res.status(400).json({ error: 'Module does not belong to the quiz course' });
        }
        resolvedModuleId = module.id;
      }
    }

    if (updates.lessonId !== undefined) {
      if (!updates.lessonId) {
        resolvedLessonId = null;
      } else {
        const [lesson] = await db.select().from(moduleLessons).where(eq(moduleLessons.id, updates.lessonId));
        if (!lesson) {
          return res.status(404).json({ error: 'Lesson not found' });
        }
        if (resolvedModuleId && lesson.moduleId !== resolvedModuleId) {
          return res.status(400).json({ error: 'Lesson does not belong to the specified module' });
        }
        // When module is not explicitly provided but lesson is, derive module
        if (!resolvedModuleId) {
          const [lessonModule] = await db.select().from(courseModules).where(eq(courseModules.id, lesson.moduleId));
          if (!lessonModule || lessonModule.courseId !== existingQuiz.courseId) {
            return res.status(400).json({ error: 'Lesson module does not belong to the quiz course' });
          }
          resolvedModuleId = lesson.moduleId;
        }
        resolvedLessonId = lesson.id;
      }
    }

    updateData.moduleId = resolvedModuleId;
    updateData.lessonId = resolvedLessonId;
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.instructions !== undefined) updateData.instructions = updates.instructions;
    if (updates.passingScore !== undefined) updateData.passingScore = updates.passingScore;
    if (updates.timeLimitMinutes !== undefined) updateData.timeLimit = updates.timeLimitMinutes;
    if (updates.maxAttempts !== undefined) updateData.maxAttempts = updates.maxAttempts;
    if (updates.shuffleQuestions !== undefined) updateData.shuffleQuestions = updates.shuffleQuestions;
    if (updates.shuffleOptions !== undefined) updateData.shuffleOptions = updates.shuffleOptions;
    if (updates.showCorrectAnswers !== undefined) updateData.showCorrectAnswers = updates.showCorrectAnswers;
    if (updates.showScore !== undefined) updateData.showScore = updates.showScore;
    if (updates.isRequired !== undefined) updateData.isRequired = updates.isRequired;
    if (updates.isPublished !== undefined) updateData.isPublished = updates.isPublished;
    if (updates.orderIndex !== undefined) updateData.orderIndex = updates.orderIndex;
    
    await db.update(quizzes).set(updateData).where(eq(quizzes.id, quizId));
    
    const [updatedQuiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
    
    res.json({
      message: 'Quiz updated successfully',
      quiz: updatedQuiz,
    });
  } catch (error) {
    console.error('Error updating quiz:', error);
    res.status(500).json({ error: 'Failed to update quiz' });
  }
});

/**
 * Delete a quiz
 * DELETE /api/quizzes/:quizId
 */
router.delete('/:quizId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { quizId } = req.params;
    
    const [existingQuiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
    if (!existingQuiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    
    await db.delete(quizzes).where(eq(quizzes.id, quizId));
    
    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    res.status(500).json({ error: 'Failed to delete quiz' });
  }
});

// =====================================================
// Question Management (Admin)
// =====================================================

/**
 * Add a question to a quiz
 * POST /api/quizzes/:quizId/questions
 */
router.post('/:quizId/questions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { quizId } = req.params;
    const {
      questionText,
      questionType,
      options,
      correctAnswer,
      explanation,
      points,
      orderIndex,
      difficulty,
      tags,
    } = req.body;
    
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    
    // Get the next order index if not provided
    let newOrderIndex = orderIndex;
    if (!newOrderIndex) {
      const existingQuestions = await db
        .select()
        .from(quizQuestions)
        .where(eq(quizQuestions.quizId, quizId));
      newOrderIndex = existingQuestions.length + 1;
    }
    
    const questionId = randomUUID();

    await db.insert(quizQuestions).values({
      id: questionId,
      quizId,
      questionText,
      questionType: questionType || 'multiple_choice',
      options: options ? JSON.stringify(options) : '[]',
      correctAnswer: typeof correctAnswer === 'object' ? JSON.stringify(correctAnswer) : correctAnswer,
      explanation,
      points: QUIZ_CORRECT_POINTS,
      orderIndex: newOrderIndex,
      difficulty: difficulty || 'medium',
      tags: tags ? JSON.stringify(tags) : '[]',
    });
    
    // Update quiz totals
    const allQuestions = await db.select().from(quizQuestions).where(eq(quizQuestions.quizId, quizId));
    const totalPoints = allQuestions.length * QUIZ_CORRECT_POINTS;
    
    await db.update(quizzes).set({
      totalQuestions: allQuestions.length,
      totalPoints,
    }).where(eq(quizzes.id, quizId));
    
    const [newQuestion] = await db.select().from(quizQuestions).where(eq(quizQuestions.id, questionId));
    
    res.status(201).json({
      message: 'Question added successfully',
      question: newQuestion,
    });
  } catch (error) {
    console.error('Error adding question:', error);
    res.status(500).json({ error: 'Failed to add question' });
  }
});

/**
 * Update a question
 * PUT /api/quizzes/questions/:questionId
 */
router.put('/questions/:questionId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { questionId } = req.params;
    const updates = req.body;
    
    const [existingQuestion] = await db.select().from(quizQuestions).where(eq(quizQuestions.id, questionId));
    if (!existingQuestion) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    const updateData = {};
    if (updates.questionText !== undefined) updateData.questionText = updates.questionText;
    if (updates.questionType !== undefined) updateData.questionType = updates.questionType;
    if (updates.options !== undefined) updateData.options = JSON.stringify(updates.options);
    if (updates.correctAnswer !== undefined) {
      updateData.correctAnswer = typeof updates.correctAnswer === 'object' 
        ? JSON.stringify(updates.correctAnswer) 
        : updates.correctAnswer;
    }
    if (updates.explanation !== undefined) updateData.explanation = updates.explanation;
    if (updates.points !== undefined) {
      updateData.points = QUIZ_CORRECT_POINTS;
    }
    if (updates.orderIndex !== undefined) updateData.orderIndex = updates.orderIndex;
    if (updates.difficulty !== undefined) updateData.difficulty = updates.difficulty;
    if (updates.tags !== undefined) updateData.tags = JSON.stringify(updates.tags);
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
    
    await db.update(quizQuestions).set(updateData).where(eq(quizQuestions.id, questionId));
    
    // Update quiz totals if points changed
    if (updates.points !== undefined) {
      const allQuestions = await db.select().from(quizQuestions).where(eq(quizQuestions.quizId, existingQuestion.quizId));
      const totalPoints = allQuestions.length * QUIZ_CORRECT_POINTS;
      await db.update(quizzes).set({ totalPoints }).where(eq(quizzes.id, existingQuestion.quizId));
    }
    
    const [updatedQuestion] = await db.select().from(quizQuestions).where(eq(quizQuestions.id, questionId));
    
    res.json({
      message: 'Question updated successfully',
      question: updatedQuestion,
    });
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ error: 'Failed to update question' });
  }
});

/**
 * Delete a question
 * DELETE /api/quizzes/questions/:questionId
 */
router.delete('/questions/:questionId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { questionId } = req.params;
    
    const [existingQuestion] = await db.select().from(quizQuestions).where(eq(quizQuestions.id, questionId));
    if (!existingQuestion) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    await db.delete(quizQuestions).where(eq(quizQuestions.id, questionId));
    
    // Update quiz totals
    const allQuestions = await db.select().from(quizQuestions).where(eq(quizQuestions.quizId, existingQuestion.quizId));
    const totalPoints = allQuestions.length * QUIZ_CORRECT_POINTS;
    
    await db.update(quizzes).set({
      totalQuestions: allQuestions.length,
      totalPoints,
    }).where(eq(quizzes.id, existingQuestion.quizId));
    
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

// =====================================================
// Quiz Taking (Student)
// =====================================================

/**
 * Start a quiz attempt
 * POST /api/quizzes/:quizId/start
 */
router.post('/:quizId/start', authenticateToken, async (req, res) => {
  try {
    const { quizId } = req.params;
    const userId = req.user.id;
    
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    
    if (!quiz.isPublished) {
      return res.status(400).json({ error: 'Quiz is not available' });
    }
    
    // Check if user has enrollment for this course
    const [enrollment] = await db
      .select()
      .from(enrollments)
      .where(and(
        eq(enrollments.userId, userId),
        eq(enrollments.courseId, quiz.courseId)
      ));
    
    if (!enrollment) {
      return res.status(403).json({ error: 'You must be enrolled in the course to take this quiz' });
    }
    
    // Check max attempts
    if (quiz.maxAttempts) {
      const userAttempts = await db
        .select()
        .from(quizAttempts)
        .where(and(
          eq(quizAttempts.quizId, quizId),
          eq(quizAttempts.userId, userId)
        ));
      
      if (userAttempts.length >= quiz.maxAttempts) {
        return res.status(400).json({ error: 'Maximum attempts reached for this quiz' });
      }
    }
    
    // Check for an existing in-progress attempt
    const [existingAttempt] = await db
      .select()
      .from(quizAttempts)
      .where(and(
        eq(quizAttempts.quizId, quizId),
        eq(quizAttempts.userId, userId),
        eq(quizAttempts.status, 'in_progress')
      ));
    
    if (existingAttempt) {
      return res.json({
        message: 'Resuming existing attempt',
        attempt: existingAttempt,
      });
    }
    
    // Get the attempt number
    const previousAttempts = await db
      .select()
      .from(quizAttempts)
      .where(and(
        eq(quizAttempts.quizId, quizId),
        eq(quizAttempts.userId, userId)
      ));
    
    const attemptId = randomUUID();
    const attemptNumber = previousAttempts.length + 1;
    
    const maxPoints = (quiz.totalQuestions || 0) * QUIZ_CORRECT_POINTS;

    await db.insert(quizAttempts).values({
      id: attemptId,
      quizId,
      userId,
      enrollmentId: enrollment.id,
      attemptNumber,
      status: 'in_progress',
      totalPoints: maxPoints,
      totalQuestions: quiz.totalQuestions,
    });
    
    const [newAttempt] = await db.select().from(quizAttempts).where(eq(quizAttempts.id, attemptId));
    
    res.status(201).json({
      message: 'Quiz attempt started',
      attempt: newAttempt,
    });
  } catch (error) {
    console.error('Error starting quiz:', error);
    res.status(500).json({ error: 'Failed to start quiz' });
  }
});

/**
 * Submit quiz answers
 * POST /api/quizzes/:quizId/submit
 */
router.post('/:quizId/submit', authenticateToken, async (req, res) => {
  try {
    const { quizId } = req.params;
    const { attemptId, answers, timeSpentSeconds } = req.body;
    const userId = req.user.id;
    
    // Get the attempt
    const [attempt] = await db
      .select()
      .from(quizAttempts)
      .where(and(
        eq(quizAttempts.id, attemptId),
        eq(quizAttempts.userId, userId)
      ));
    
    if (!attempt) {
      return res.status(404).json({ error: 'Attempt not found' });
    }
    
    if (attempt.status !== 'in_progress') {
      return res.status(400).json({ error: 'This attempt has already been submitted' });
    }
    
    // Get quiz and questions
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
    const questions = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quizId));
    
    const maxPoints = (questions.length || 0) * QUIZ_CORRECT_POINTS;
    const normalizedAnswers = answers && typeof answers === 'object' ? answers : {};
    
    let correctAnswers = 0;
    let pointsEarned = 0;
    const questionResults = [];
    
    for (const question of questions) {
      const userAnswer = normalizedAnswers[question.id];
      const correctAnswer = question.correctAnswer;
      
      let parsedCorrectAnswer = correctAnswer;
      try {
        parsedCorrectAnswer = JSON.parse(correctAnswer);
      } catch (e) {
        // Not JSON, keep as-is
      }
      
      let isCorrect = false;
      const questionType = question.questionType || 'multiple_choice';
      const userProvidedAnswer = userAnswer !== undefined && userAnswer !== null && userAnswer !== '';
      
      if (questionType === 'multiple_choice' || questionType === 'true_false') {
        isCorrect = userAnswer === parsedCorrectAnswer;
      } else if (questionType === 'multiple_select') {
        const userAnswerSet = new Set(Array.isArray(userAnswer) ? userAnswer : []);
        const correctSet = new Set(Array.isArray(parsedCorrectAnswer) ? parsedCorrectAnswer : []);
        isCorrect = userAnswerSet.size === correctSet.size &&
          [...userAnswerSet].every((value) => correctSet.has(value));
      } else if (questionType === 'short_answer') {
        isCorrect = typeof userAnswer === 'string' &&
          String(userAnswer).toLowerCase().trim() === String(parsedCorrectAnswer).toLowerCase().trim();
      }
      
      let pointsForQuestion = 0;
      if (isCorrect) {
        correctAnswers += 1;
        pointsForQuestion = QUIZ_CORRECT_POINTS;
      } else if (userProvidedAnswer) {
        pointsForQuestion = -QUIZ_WRONG_PENALTY;
      }
      pointsEarned += pointsForQuestion;
      
      questionResults.push({
        questionId: question.id,
        userAnswer,
        correctAnswer: quiz.showCorrectAnswers ? parsedCorrectAnswer : undefined,
        isCorrect,
        points: pointsForQuestion,
        maxPoints: QUIZ_CORRECT_POINTS,
        explanation: quiz.showCorrectAnswers ? question.explanation : undefined,
      });
    }
    
    // Clamp points to allowed range
    const adjustedPoints = Math.min(Math.max(pointsEarned, 0), maxPoints);
    const score = maxPoints > 0
      ? Math.round(((adjustedPoints / maxPoints) * 100) * 100) / 100
      : 0;
    const passed = score >= quiz.passingScore;
    
    // Update the attempt
    const now = new Date();
    const attemptTimeMinutes = timeSpentSeconds ? Math.max(Math.round(timeSpentSeconds / 60), 0) : 0;

    await db.update(quizAttempts).set({
      status: 'completed',
      score,
      pointsEarned: adjustedPoints,
      correctAnswers,
      passed,
      answers: JSON.stringify(normalizedAnswers),
      questionResults: JSON.stringify(questionResults),
      timeSpentSeconds: timeSpentSeconds || 0,
      totalPoints: maxPoints,
      submittedAt: now,
      gradedAt: now,
    }).where(eq(quizAttempts.id, attemptId));
    
    // Update module progress if quiz is associated with a module
    if (quiz.moduleId) {
      const [existingModuleProgress] = await db
        .select()
        .from(userModuleProgress)
        .where(and(
          eq(userModuleProgress.userId, userId),
          eq(userModuleProgress.moduleId, quiz.moduleId)
        ));

      if (existingModuleProgress) {
        await db.update(userModuleProgress).set({
          quizScore: score,
          quizPassed: passed ? true : existingModuleProgress.quizPassed,
          quizAttempts: (existingModuleProgress.quizAttempts || 0) + 1,
          status: passed ? 'completed' : 'in_progress',
          isCompleted: passed ? true : existingModuleProgress.isCompleted,
          progressPercentage: passed ? 100 : existingModuleProgress.progressPercentage,
          completedAt: passed && !existingModuleProgress.completedAt ? now : existingModuleProgress.completedAt,
          lastAccessedAt: now,
          isUnlocked: true,
          timeSpentMinutes: (existingModuleProgress.timeSpentMinutes || 0) + attemptTimeMinutes,
        }).where(eq(userModuleProgress.id, existingModuleProgress.id));
      } else {
        const progressId = randomUUID();
        await db.insert(userModuleProgress).values({
          id: progressId,
          userId,
          courseId: quiz.courseId,
          moduleId: quiz.moduleId,
          enrollmentId: attempt.enrollmentId,
          status: passed ? 'completed' : 'in_progress',
          progressPercentage: passed ? 100 : 0,
          isUnlocked: true,
          isCompleted: passed,
          completedAt: passed ? now : null,
          lastAccessedAt: now,
          timeSpentMinutes: attemptTimeMinutes,
          quizScore: score,
          quizPassed: passed,
          quizAttempts: 1,
        });
      }
    }

    // Update lesson progress if quiz is linked to a lesson
    if (quiz.lessonId) {
      const [existingLessonProgress] = await db
        .select()
        .from(userLessonProgress)
        .where(and(
          eq(userLessonProgress.userId, userId),
          eq(userLessonProgress.lessonId, quiz.lessonId)
        ));

      if (existingLessonProgress) {
        await db.update(userLessonProgress).set({
          status: passed ? 'completed' : 'in_progress',
          progressPercentage: passed ? 100 : existingLessonProgress.progressPercentage,
          isCompleted: passed ? true : existingLessonProgress.isCompleted,
          completedAt: passed && !existingLessonProgress.completedAt ? now : existingLessonProgress.completedAt,
          lastAccessedAt: now,
          timeSpentMinutes: (existingLessonProgress.timeSpentMinutes || 0) + attemptTimeMinutes,
        }).where(eq(userLessonProgress.id, existingLessonProgress.id));
      } else {
        const lessonProgressId = randomUUID();
        await db.insert(userLessonProgress).values({
          id: lessonProgressId,
          userId,
          moduleId: quiz.moduleId,
          lessonId: quiz.lessonId,
          enrollmentId: attempt.enrollmentId,
          status: passed ? 'completed' : 'in_progress',
          progressPercentage: passed ? 100 : 0,
          isCompleted: passed,
          completedAt: passed ? now : null,
          lastAccessedAt: now,
          lastPosition: 0,
          timeSpentMinutes: attemptTimeMinutes,
        });
      }
    }
    
    const [updatedAttempt] = await db.select().from(quizAttempts).where(eq(quizAttempts.id, attemptId));
    
    res.json({
      message: passed ? 'Congratulations! You passed the quiz!' : 'Quiz submitted. Better luck next time!',
      attempt: {
        ...updatedAttempt,
        questionResults: quiz.showCorrectAnswers ? questionResults : undefined,
      },
      passed,
      score,
      correctAnswers,
      totalQuestions: questions.length,
      pointsEarned: adjustedPoints,
      totalPoints: maxPoints,
    });
  } catch (error) {
    console.error('Error submitting quiz:', error);
    res.status(500).json({ error: 'Failed to submit quiz' });
  }
});

/**
 * Get user's quiz attempts
 * GET /api/quizzes/:quizId/attempts
 */
router.get('/:quizId/attempts', authenticateToken, async (req, res) => {
  try {
    const { quizId } = req.params;
    const userId = req.user.id;
    
    const attempts = await db
      .select()
      .from(quizAttempts)
      .where(and(
        eq(quizAttempts.quizId, quizId),
        eq(quizAttempts.userId, userId)
      ))
      .orderBy(desc(quizAttempts.createdAt));
    
    res.json(attempts);
  } catch (error) {
    console.error('Error fetching attempts:', error);
    res.status(500).json({ error: 'Failed to fetch attempts' });
  }
});

/**
 * Get a specific attempt details
 * GET /api/quizzes/attempts/:attemptId
 */
router.get('/attempts/:attemptId', authenticateToken, async (req, res) => {
  try {
    const { attemptId } = req.params;
    const userId = req.user.id;
    
    const [attempt] = await db
      .select()
      .from(quizAttempts)
      .where(eq(quizAttempts.id, attemptId));
    
    if (!attempt) {
      return res.status(404).json({ error: 'Attempt not found' });
    }
    
    // Only allow user to view their own attempts or admin
    if (attempt.userId !== userId && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(attempt);
  } catch (error) {
    console.error('Error fetching attempt:', error);
    res.status(500).json({ error: 'Failed to fetch attempt' });
  }
});

// Helper function to shuffle array
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export default router;
