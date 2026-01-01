/* eslint-disable no-console */
import { Router } from 'express';
import { randomUUID } from 'crypto';
import { and, eq, asc, desc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { 
  quizzes, 
  quizQuestions, 
  quizAttempts,
  courses,
  courseModules,
  enrollments,
  userModuleProgress,
} from '../db/schema.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

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
    if (moduleId) {
      const [module] = await db.select().from(courseModules).where(eq(courseModules.id, moduleId));
      if (!module) {
        return res.status(404).json({ error: 'Module not found' });
      }
    }
    
    const quizId = randomUUID();
    
    await db.insert(quizzes).values({
      id: quizId,
      courseId,
      moduleId,
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
      points: points || 1,
      orderIndex: newOrderIndex,
      difficulty: difficulty || 'medium',
      tags: tags ? JSON.stringify(tags) : '[]',
    });
    
    // Update quiz totals
    const allQuestions = await db.select().from(quizQuestions).where(eq(quizQuestions.quizId, quizId));
    const totalPoints = allQuestions.reduce((sum, q) => sum + q.points, 0);
    
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
    if (updates.points !== undefined) updateData.points = updates.points;
    if (updates.orderIndex !== undefined) updateData.orderIndex = updates.orderIndex;
    if (updates.difficulty !== undefined) updateData.difficulty = updates.difficulty;
    if (updates.tags !== undefined) updateData.tags = JSON.stringify(updates.tags);
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
    
    await db.update(quizQuestions).set(updateData).where(eq(quizQuestions.id, questionId));
    
    // Update quiz totals if points changed
    if (updates.points !== undefined) {
      const allQuestions = await db.select().from(quizQuestions).where(eq(quizQuestions.quizId, existingQuestion.quizId));
      const totalPoints = allQuestions.reduce((sum, q) => sum + q.points, 0);
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
    const totalPoints = allQuestions.reduce((sum, q) => sum + q.points, 0);
    
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
    
    await db.insert(quizAttempts).values({
      id: attemptId,
      quizId,
      userId,
      enrollmentId: enrollment.id,
      attemptNumber,
      status: 'in_progress',
      totalPoints: quiz.totalPoints,
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
    
    // Grade the quiz
    let correctAnswers = 0;
    let pointsEarned = 0;
    const questionResults = [];
    
    for (const question of questions) {
      const userAnswer = answers[question.id];
      const correctAnswer = question.correctAnswer;
      
      // Parse correct answer if it's JSON
      let parsedCorrectAnswer = correctAnswer;
      try {
        parsedCorrectAnswer = JSON.parse(correctAnswer);
      } catch (e) {
        // Not JSON, use as is
      }
      
      let isCorrect = false;
      
      if (question.questionType === 'multiple_choice' || question.questionType === 'true_false') {
        isCorrect = userAnswer === parsedCorrectAnswer;
      } else if (question.questionType === 'multiple_select') {
        // For multiple select, check if arrays match
        const userAnswerSet = new Set(Array.isArray(userAnswer) ? userAnswer : []);
        const correctSet = new Set(Array.isArray(parsedCorrectAnswer) ? parsedCorrectAnswer : []);
        isCorrect = userAnswerSet.size === correctSet.size && 
                    [...userAnswerSet].every(a => correctSet.has(a));
      } else if (question.questionType === 'short_answer') {
        // Case-insensitive comparison for short answers
        isCorrect = String(userAnswer).toLowerCase().trim() === 
                    String(parsedCorrectAnswer).toLowerCase().trim();
      }
      
      if (isCorrect) {
        correctAnswers++;
        pointsEarned += question.points;
      }
      
      questionResults.push({
        questionId: question.id,
        userAnswer,
        correctAnswer: quiz.showCorrectAnswers ? parsedCorrectAnswer : undefined,
        isCorrect,
        points: isCorrect ? question.points : 0,
        maxPoints: question.points,
        explanation: quiz.showCorrectAnswers ? question.explanation : undefined,
      });
    }
    
    // Calculate score percentage
    const score = quiz.totalPoints > 0 
      ? Math.round((pointsEarned / quiz.totalPoints) * 100 * 100) / 100
      : 0;
    
    const passed = score >= quiz.passingScore;
    
    // Update the attempt
    await db.update(quizAttempts).set({
      status: 'completed',
      score,
      pointsEarned,
      correctAnswers,
      passed,
      answers: JSON.stringify(answers),
      questionResults: JSON.stringify(questionResults),
      timeSpentSeconds: timeSpentSeconds || 0,
      submittedAt: new Date(),
      gradedAt: new Date(),
    }).where(eq(quizAttempts.id, attemptId));
    
    // Update module progress if quiz is associated with a module
    if (quiz.moduleId && passed) {
      await db.update(userModuleProgress).set({
        quizScore: score,
        quizPassed: true,
        quizAttempts: sql`quiz_attempts + 1`,
      }).where(and(
        eq(userModuleProgress.userId, userId),
        eq(userModuleProgress.moduleId, quiz.moduleId)
      ));
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
      pointsEarned,
      totalPoints: quiz.totalPoints,
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
