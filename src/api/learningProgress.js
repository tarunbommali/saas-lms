/**
 * Learning Progress API - Track course, module, and lesson progress
 */
import apiRequest from './client.js';

/**
 * Get complete progress for a course
 * Returns overall progress, module progress, and lesson progress
 */
export const getCourseProgress = (courseId) => 
  apiRequest(`/learning-progress/${courseId}`);

/**
 * Update module progress
 */
export const updateModuleProgress = (moduleId, payload) => 
  apiRequest(`/learning-progress/module/${moduleId}`, {
    method: 'PUT',
    body: payload,
  });

/**
 * Update lesson progress
 */
export const updateLessonProgress = (lessonId, payload) => 
  apiRequest(`/learning-progress/lesson/${lessonId}`, {
    method: 'PUT',
    body: payload,
  });

/**
 * Mark module as complete
 */
export const completeModule = (moduleId) => 
  apiRequest(`/learning-progress/module/${moduleId}/complete`, {
    method: 'POST',
  });

export default {
  getCourseProgress,
  updateModuleProgress,
  updateLessonProgress,
  completeModule,
};
