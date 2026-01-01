/**
 * Quiz Service  
 * Complete quiz management with grading and attempt tracking
 */

import { randomUUID } from 'crypto';
import quizRepository from '../repositories/quiz.repository.js';
import moduleRepository from '../repositories/module.repository.js';
import progressRepository from '../repositories/progress.repository.js';

export class QuizService {
  /**
   * Create quiz for module
   * @param {string} moduleId - Module ID
   * @param {Object} quizData - Quiz data
   * @param {Array} questions - Questions array
   * @param {string} createdBy - User ID
   * @returns {Promise<Object>}
   */
  async createQuiz(moduleId, quizData, questions, createdBy) {
    // Verify module exists
    const module = await moduleRepository.findById(moduleId);
    if (!module) {
      throw new Error('Module not found');
    }
    
    // Check if quiz already exists for this module
    const existingQuiz = await quizRepository.findByModule(moduleId);
    if (existingQuiz) {
      throw new Error('Quiz already exists for this module');
    }
    
    const quizId = randomUUID();
    
    // Prepare quiz data
    const quiz = {
      id: quizId,
      moduleId,
      title: quizData.title || `${module.title} Quiz`,
      description: quizData.description || '',
      passingScore: quizData.passingScore || 70,
      timeLimit: quizData.timeLimit || null,
      maxAttempts: quizData.maxAttempts || null,
      shuffleQuestions: quizData.shuffleQuestions || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Prepare questions with IDs
    const preparedQuestions = questions.map((q, index) => ({
      id: randomUUID(),
      quizId,
      question: q.question,
      questionType: q.questionType || 'multiple_choice',
      options: JSON.stringify(q.options || []),
      correctAnswer: q.correctAnswer,
      points: q.points || 1,
      orderIndex: index + 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    
    return await quizRepository.createWithQuestions(quiz, preparedQuestions);
  }

  /**
   * Update quiz
   * @param {string} quizId - Quiz ID
   * @param {Object} quizData - Quiz data
   * @param {Array} questions - Questions array (optional)
   * @returns {Promise<Object>}
   */
  async updateQuiz(quizId, quizData, questions) {
    const quiz = await quizRepository.findById(quizId);
    if (!quiz) {
      throw new Error('Quiz not found');
    }
    
    // Update quiz details
    await quizRepository.update(quizId, quizData);
    
    // Update questions if provided
    if (questions && questions.length > 0) {
      const preparedQuestions = questions.map((q, index) => ({
        id: randomUUID(),
        quizId,
        question: q.question,
        questionType: q.questionType || 'multiple_choice',
        options: JSON.stringify(q.options || []),
        correctAnswer: q.correctAnswer,
        points: q.points || 1,
        orderIndex: index + 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      
      await quizRepository.updateQuestions(quizId, preparedQuestions);
    }
    
    return await quizRepository.findWithQuestions(quizId);
  }

  /**
   * Get quiz for module
   * @param {string} moduleId - Module ID
   * @param {string} userId - User ID (for attempt info)
   * @returns {Promise<Object>}
   */
  async getQuizByModule(moduleId, userId) {
    const quiz = await quizRepository.findByModule(moduleId);
    
    if (!quiz) {
      return null;
    }
    
    const quizWithQuestions = await quizRepository.findWithQuestions(quiz.id);
    
    // Get user attempts
    const attempts = await quizRepository.getUserAttempts(quiz.id, userId);
    const bestScore = await quizRepository.getBestScore(quiz.id, userId);
    const hasPassed = await quizRepository.hasUserPassed(quiz.id, userId);
    
    // Remove correct answers from questions for students
    const sanitizedQuestions = quizWithQuestions.questions.map(q => {
      const { correctAnswer, ...rest } = q;
      return rest;
    });
    
    return {
      ...quizWithQuestions,
      questions: sanitizedQuestions,
      userAttempts: attempts.length,
      bestScore,
      hasPassed,
      canAttempt: !quiz.maxAttempts || attempts.length < quiz.maxAttempts,
    };
  }

  /**
   * Attempt quiz (submit answers)
   * @param {string} quizId - Quiz ID
   * @param {string} userId - User ID
   * @param {Object} answers - User answers {questionId: answer}
   * @returns {Promise<Object>}
   */
  async attemptQuiz(quizId, userId, answers) {
    const quiz = await quizRepository.findWithQuestions(quizId);
    
    if (!quiz) {
      throw new Error('Quiz not found');
    }
    
    // Check max attempts
    const previousAttempts = await quizRepository.getUserAttempts(quizId, userId);
    if (quiz.maxAttempts && previousAttempts.length >= quiz.maxAttempts) {
      throw new Error('Maximum attempts reached');
    }
    
    // Grade the quiz
    let correctCount = 0;
    let totalPoints = 0;
    let earnedPoints = 0;
    
    const results = quiz.questions.map(question => {
      totalPoints += question.points;
      const userAnswer = answers[question.id];
      const isCorrect = userAnswer === question.correctAnswer;
      
      if (isCorrect) {
        correctCount++;
        earnedPoints += question.points;
      }
      
      return {
        questionId: question.id,
        question: question.question,
        userAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        points: question.points,
        earnedPoints: isCorrect ? question.points : 0,
      };
    });
    
    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const passed = score >= quiz.passingScore;
    
    // Save attempt
    const attemptId = randomUUID();
    await quizRepository.createAttempt({
      id: attemptId,
      quizId,
      userId,
      score,
      totalQuestions: quiz.questions.length,
      correctAnswers: correctCount,
      answers: JSON.stringify(answers),
      results: JSON.stringify(results),
      passed,
      attemptedAt: new Date(),
    });
    
    // If passed, update module progress
    if (passed) {
      const module = await moduleRepository.findById(quiz.moduleId);
      await progressRepository.markCompleted(userId, quiz.moduleId, {
        courseId: module.courseId,
        quizScore: score,
      });
    }
    
    return {
      attemptId,
      score,
      passed,
      passingScore: quiz.passingScore,
      correctCount,
      totalQuestions: quiz.questions.length,
      results,
    };
  }

  /**
   * Get quiz results
   * @param {string} attemptId - Attempt ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Promise<Object>}
   */
  async getAttemptResults(attemptId, userId) {
    const [attempt] = await db
      .select()
      .from(quizAttempts)
      .where(eq(quizAttempts.id, attemptId))
      .limit(1);
    
    if (!attempt) {
      throw new Error('Attempt not found');
    }
    
    if (attempt.userId !== userId) {
      throw new Error('You do not have permission to view this attempt');
    }
    
    return {
      ...attempt,
      results: JSON.parse(attempt.results || '[]'),
      answers: JSON.parse(attempt.answers || '{}'),
    };
  }

  /**
   * Get user quiz history
   * @param {string} userId - User ID
   * @param {string} quizId - Quiz ID (optional)
   * @returns {Promise<Array>}
   */
  async getUserQuizHistory(userId, quizId = null) {
    if (quizId) {
      return await quizRepository.getUserAttempts(quizId, userId);
    }
    
    // Get all attempts for user
    return await db
      .select()
      .from(quizAttempts)
      .where(eq(quizAttempts.userId, userId))
      .orderBy(desc(quizAttempts.attemptedAt))
      .execute();
  }
}

export default new QuizService();
