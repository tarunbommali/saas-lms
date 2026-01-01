/**
 * Quiz Controller
 * Handles quiz-related HTTP requests
 */

import quizService from '../services/quiz.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export class QuizController {
  /**
   * Get quiz by module
   * GET /api/modules/:moduleId/quiz
   */
  getByModule = asyncHandler(async (req, res) => {
    const { moduleId } = req.params;
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }
    
    const quiz = await quizService.getQuizByModule(moduleId, req.user.id);
    
    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: 'No quiz found for this module',
      });
    }
    
    res.json({
      success: true,
      data: quiz,
    });
  });

  /**
   * Create quiz (Admin/Instructor)
   * POST /api/admin/modules/:moduleId/quiz
   */
  create = asyncHandler(async (req, res) => {
    const { moduleId } = req.params;
    const { quiz, questions } = req.body;
    
    if (!questions || questions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Quiz must have at least one question',
      });
    }
    
    const createdQuiz = await quizService.createQuiz(
      moduleId,
      quiz,
      questions,
      req.user.id
    );
    
    res.status(201).json({
      success: true,
      message: 'Quiz created successfully',
      data: createdQuiz,
    });
  });

  /**
   * Update quiz (Admin/Instructor)
   * PUT /api/admin/quizzes/:id
   */
  update = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { quiz, questions } = req.body;
    
    const updatedQuiz = await quizService.updateQuiz(id, quiz, questions);
    
    res.json({
      success: true,
      message: 'Quiz updated successfully',
      data: updatedQuiz,
    });
  });

  /**
   * Attempt quiz (Submit answers)
   * POST /api/quizzes/:id/attempt
   */
  attempt = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { answers } = req.body;
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }
    
    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid answers format',
      });
    }
    
    const result = await quizService.attemptQuiz(id, req.user.id, answers);
    
    res.json({
      success: true,
      message: result.passed ? 'Congratulations! You passed!' : 'Quiz completed. Try again to improve your score.',
      data: result,
    });
  });

  /**
   * Get attempt results
   * GET /api/quiz-attempts/:attemptId
   */
  getAttemptResults = asyncHandler(async (req, res) => {
    const { attemptId } = req.params;
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }
    
    const results = await quizService.getAttemptResults(attemptId, req.user.id);
    
    res.json({
      success: true,
      data: results,
    });
  });

  /**
   * Get user quiz history
   * GET /api/quizzes/my-attempts
   */
  getMyAttempts = asyncHandler(async (req, res) => {
    const { quizId } = req.query;
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }
    
    const attempts = await quizService.getUserQuizHistory(
      req.user.id,
      quizId || null
    );
    
    res.json({
      success: true,
      data: attempts,
    });
  });
}

export default new QuizController();
