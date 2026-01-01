/**
 * Modules API - Course modules and lessons management
 */
import apiRequest from './client.js';

// =====================================================
// Module APIs
// =====================================================

/**
 * Get all modules for a course
 */
export const getModulesByCourse = (courseId) => 
  apiRequest(`/modules/${courseId}`);

/**
 * Get single module details
 */
export const getModuleById = (moduleId) => 
  apiRequest(`/modules/detail/${moduleId}`);

/**
 * Create a new module (admin only)
 */
export const createModule = (payload) => 
  apiRequest('/modules', {
    method: 'POST',
    body: payload,
  });

/**
 * Update a module (admin only)
 */
export const updateModule = (moduleId, payload) => 
  apiRequest(`/modules/${moduleId}`, {
    method: 'PUT',
    body: payload,
  });

/**
 * Delete a module (admin only)
 */
export const deleteModule = (moduleId) => 
  apiRequest(`/modules/${moduleId}`, {
    method: 'DELETE',
  });

/**
 * Reorder modules (admin only)
 */
export const reorderModules = (courseId, moduleOrder) => 
  apiRequest(`/modules/reorder/${courseId}`, {
    method: 'PUT',
    body: { moduleOrder },
  });

// =====================================================
// Lesson APIs
// =====================================================

/**
 * Get all lessons for a module
 */
export const getLessonsByModule = (moduleId) => 
  apiRequest(`/modules/${moduleId}/lessons`);

/**
 * Create a new lesson (admin only)
 */
export const createLesson = (moduleId, payload) => 
  apiRequest(`/modules/${moduleId}/lessons`, {
    method: 'POST',
    body: payload,
  });

/**
 * Update a lesson (admin only)
 */
export const updateLesson = (lessonId, payload) => 
  apiRequest(`/modules/lessons/${lessonId}`, {
    method: 'PUT',
    body: payload,
  });

/**
 * Delete a lesson (admin only)
 */
export const deleteLesson = (lessonId) => 
  apiRequest(`/modules/lessons/${lessonId}`, {
    method: 'DELETE',
  });

export default {
  // Modules
  getModulesByCourse,
  getModuleById,
  createModule,
  updateModule,
  deleteModule,
  reorderModules,
  // Lessons
  getLessonsByModule,
  createLesson,
  updateLesson,
  deleteLesson,
};
