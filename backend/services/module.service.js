/**
 * Module Service
 * Business logic for course modules
 */

import { randomUUID } from 'crypto';
import moduleRepository from '../repositories/module.repository.js';
import courseRepository from '../repositories/course.repository.js';

export class ModuleService {
  /**
   * Get course modules
   * @param {string} courseId - Course ID
   * @param {boolean} publishedOnly - Return only published modules
   * @returns {Promise<Array>}
   */
  async getCourseModules(courseId, publishedOnly = false) {
    if (publishedOnly) {
      return await moduleRepository.findPublishedByCourse(courseId);
    }
    return await moduleRepository.findByCourse(courseId);
  }

  /**
   * Get module by ID
   * @param {string} moduleId - Module ID
   * @param {string} courseId - Course ID (for validation)
   * @returns {Promise<Object>}
   */
  async getModule(moduleId, courseId) {
    const module = await moduleRepository.findByIdAndCourse(moduleId, courseId);
    
    if (!module) {
      throw new Error('Module not found');
    }
    
    return module;
  }

  /**
   * Create module
   * @param {string} courseId - Course ID
   * @param {Object} moduleData - Module data
   * @param {string} createdBy - User ID
   * @returns {Promise<Object>}
   */
  async createModule(courseId, moduleData, createdBy) {
    // Verify course exists
    const course = await courseRepository.findById(courseId);
    if (!course) {
      throw new Error('Course not found');
    }
    
    // Check permissions
    if (course.instructorId !== createdBy) {
      throw new Error('You do not have permission to add modules to this course');
    }
    
    // Get next order index
    const moduleCount = await moduleRepository.countByCourse(courseId);
    
    const moduleId = randomUUID();
    const module = await moduleRepository.create({
      id: moduleId,
      courseId,
      ...moduleData,
      orderIndex: moduleData.orderIndex || moduleCount + 1,
      isPublished: moduleData.isPublished || false,
    });
    
    return module;
  }

  /**
   * Update module
   * @param {string} moduleId - Module ID
   * @param {Object} updateData - Update data
   * @param {string} userId - User ID
   * @returns {Promise<Object>}
   */
  async updateModule(moduleId, updateData, userId) {
    const module = await moduleRepository.findById(moduleId);
    if (!module) {
      throw new Error('Module not found');
    }
    
    const course = await courseRepository.findById(module.courseId);
    if (course.instructorId !== userId) {
      throw new Error('You do not have permission to update this module');
    }
    
    return await moduleRepository.update(moduleId, updateData);
  }

  /**
   * Delete module
   * @param {string} moduleId - Module ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>}
   */
  async deleteModule(moduleId, userId) {
    const module = await moduleRepository.findById(moduleId);
    if (!module) {
      throw new Error('Module not found');
    }
    
    const course = await courseRepository.findById(module.courseId);
    if (course.instructorId !== userId) {
      throw new Error('You do not have permission to delete this module');
    }
    
    await moduleRepository.softDelete(moduleId);
    return true;
  }

  /**
   * Reorder modules
   * @param {string} courseId - Course ID
   * @param {Array} moduleOrders - Array of {id, orderIndex}
   * @param {string} userId - User ID
   * @returns {Promise<boolean>}
   */
  async reorderModules(courseId, moduleOrders, userId) {
    const course = await courseRepository.findById(courseId);
    if (!course) {
      throw new Error('Course not found');
    }
    
    if (course.instructorId !== userId) {
      throw new Error('You do not have permission to reorder modules');
    }
    
    return await moduleRepository.reorderModules(courseId, moduleOrders);
  }

  /**
   * Get next module
   * @param {string} courseId - Course ID
   * @param {string} currentModuleId - Current module ID
   * @returns {Promise<Object|null>}
   */
  async getNextModule(courseId, currentModuleId) {
    const currentModule = await moduleRepository.findById(currentModuleId);
    if (!currentModule) {
      return null;
    }
    
    return await moduleRepository.getNextModule(courseId, currentModule.orderIndex);
  }

  /**
   * Get previous module
   * @param {string} courseId - Course ID
   * @param {string} currentModuleId - Current module ID
   * @returns {Promise<Object|null>}
   */
  async getPreviousModule(courseId, currentModuleId) {
    const currentModule = await moduleRepository.findById(currentModuleId);
    if (!currentModule) {
      return null;
    }
    
    return await moduleRepository.getPreviousModule(courseId, currentModule.orderIndex);
  }
}

export default new ModuleService();
