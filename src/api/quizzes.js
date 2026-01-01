/**
 * Quizzes API - Quiz management and taking
 */
import apiRequest from './client.js';

// =====================================================
// Quiz Management (Admin)
// =====================================================

/**
 * Get all quizzes for a course
 */
export const getQuizzesByCourse = (courseId) => 
  apiRequest(`/quizzes/course/${courseId}`);

/**
 * Get all quizzes for a module
 */
export const getQuizzesByModule = (moduleId) => 
  apiRequest(`/quizzes/module/${moduleId}`);

/**
 * Get quiz with questions
 */
export const getQuizById = (quizId) => 
  apiRequest(`/quizzes/${quizId}`);

/**
 * Create a new quiz (admin only)
 */
export const createQuiz = (payload) => 
  apiRequest('/quizzes', {
    method: 'POST',
    body: payload,
  });

/**
 * Update a quiz (admin only)
 */
export const updateQuiz = (quizId, payload) => 
  apiRequest(`/quizzes/${quizId}`, {
    method: 'PUT',
    body: payload,
  });

/**
 * Delete a quiz (admin only)
 */
export const deleteQuiz = (quizId) => 
  apiRequest(`/quizzes/${quizId}`, {
    method: 'DELETE',
  });

// =====================================================
// Question Management (Admin)
// =====================================================

/**
 * Add question to quiz (admin only)
 */
export const addQuestion = (quizId, payload) => 
  apiRequest(`/quizzes/${quizId}/questions`, {
    method: 'POST',
    body: payload,
  });

/**
 * Update a question (admin only)
 */
export const updateQuestion = (questionId, payload) => 
  apiRequest(`/quizzes/questions/${questionId}`, {
    method: 'PUT',
    body: payload,
  });

/**
 * Delete a question (admin only)
 */
export const deleteQuestion = (questionId) => 
  apiRequest(`/quizzes/questions/${questionId}`, {
    method: 'DELETE',
  });

// =====================================================
// Quiz Taking (Student)
// =====================================================

/**
 * Start a quiz attempt
 */
export const startQuizAttempt = (quizId) => 
  apiRequest(`/quizzes/${quizId}/start`, {
    method: 'POST',
  });

/**
 * Submit quiz answers
 */
export const submitQuizAnswers = (quizId, payload) => 
  apiRequest(`/quizzes/${quizId}/submit`, {
    method: 'POST',
    body: payload,
  });

/**
 * Get user's attempts for a quiz
 */
export const getQuizAttempts = (quizId) => 
  apiRequest(`/quizzes/${quizId}/attempts`);

/**
 * Get specific attempt details
 */
export const getAttemptById = (attemptId) => 
  apiRequest(`/quizzes/attempts/${attemptId}`);

export default {
  // Quiz management
  getQuizzesByCourse,
  getQuizzesByModule,
  getQuizById,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  // Question management
  addQuestion,
  updateQuestion,
  deleteQuestion,
  // Quiz taking
  startQuizAttempt,
  submitQuizAnswers,
  getQuizAttempts,
  getAttemptById,
};
