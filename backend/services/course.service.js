/**
 * Course Service
 * Business logic for course management
 */

import { randomUUID } from 'crypto';
import courseRepository from '../repositories/course.repository.js';

export class CourseService {
  /**
   * Get all published courses
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>}
   */
  async getPublishedCourses(filters = {}) {
    const { page = 1, limit = 10, category, difficulty, search } = filters;
    const offset = (page - 1) * limit;
    
    let courses;
    if (search) {
      courses = await courseRepository.search(search, { limit, offset });
    } else {
      courses = await courseRepository.findPublished({
        limit,
        offset,
        category,
        difficulty,
      });
    }
    
    const total = await courseRepository.count({ isPublished: true });
    
    return {
      courses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get course by ID or slug
   * @param {string} identifier - Course ID or slug
   * @returns {Promise<Object>}
   */
  async getCourse(identifier) {
    let course;
    
    // Try to find by ID first
    if (identifier.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      course = await courseRepository.findById(identifier);
    }
    
    // If not found, try slug
    if (!course) {
      course = await courseRepository.findBySlug(identifier);
    }
    
    if (!course) {
      throw new Error('Course not found');
    }
    
    return course;
  }

  /**
   * Create new course
   * @param {Object} courseData - Course data
   * @param {string} createdBy - User ID
   * @returns {Promise<Object>}
   */
  async createCourse(courseData, createdBy) {
    const { title, description, price, category, difficulty } = courseData;
    
    // Validate required fields
    if (!title || !description || price === undefined) {
      throw new Error('Missing required fields: title, description, price');
    }
    
    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    
    // Check if slug exists
    const existingCourse = await courseRepository.findBySlug(slug);
    if (existingCourse) {
      throw new Error('A course with this title already exists');
    }
    
    const courseId = randomUUID();
    const course = await courseRepository.create({
      id: courseId,
      ...courseData,
      slug,
      instructorId: createdBy,
      isPublished: false,
      enrollmentCount: 0,
      averageRating: 0,
      reviewCount: 0,
    });
    
    return course;
  }

  /**
   * Update course
   * @param {string} courseId - Course ID
   * @param {Object} updateData - Update data
   * @param {string} userId - User ID making update
   * @returns {Promise<Object>}
   */
  async updateCourse(courseId, updateData, userId) {
    const course = await courseRepository.findById(courseId);
    
    if (!course) {
      throw new Error('Course not found');
    }
    
    // Check permissions (instructor or admin)
    if (course.instructorId !== userId) {
      throw new Error('You do not have permission to update this course');
    }
    
    // If title is being updated, regenerate slug
    if (updateData.title && updateData.title !== course.title) {
      const newSlug = updateData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      
      const existingCourse = await courseRepository.findBySlug(newSlug);
      if (existingCourse && existingCourse.id !== courseId) {
        throw new Error('A course with this title already exists');
      }
      
      updateData.slug = newSlug;
    }
    
    const updatedCourse = await courseRepository.update(courseId, updateData);
    return updatedCourse;
  }

  /**
   * Delete course
   * @param {string} courseId - Course ID
   * @param {string} userId - User ID making deletion
   * @returns {Promise<boolean>}
   */
  async deleteCourse(courseId, userId) {
    const course = await courseRepository.findById(courseId);
    
    if (!course) {
      throw new Error('Course not found');
    }
    
    // Check permissions
    if (course.instructorId !== userId) {
      throw new Error('You do not have permission to delete this course');
    }
    
    // Check if course has enrollments
    if (course.enrollmentCount > 0) {
      throw new Error('Cannot delete course with active enrollments');
    }
    
    await courseRepository.softDelete(courseId);
    return true;
  }

  /**
   * Publish course
   * @param {string} courseId - Course ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>}
   */
  async publishCourse(courseId, userId) {
    const course = await courseRepository.findById(courseId);
    
    if (!course) {
      throw new Error('Course not found');
    }
    
    if (course.instructorId !== userId) {
      throw new Error('You do not have permission to publish this course');
    }
    
    if (course.isPublished) {
      throw new Error('Course is already published');
    }
    
    const publishedCourse = await courseRepository.publish(courseId);
    return publishedCourse;
  }

  /**
   * Unpublish course
   * @param {string} courseId - Course ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>}
   */
  async unpublishCourse(courseId, userId) {
    const course = await courseRepository.findById(courseId);
    
    if (!course) {
      throw new Error('Course not found');
    }
    
    if (course.instructorId !== userId) {
      throw new Error('You do not have permission to unpublish this course');
    }
    
    const unpublishedCourse = await courseRepository.unpublish(courseId);
    return unpublishedCourse;
  }

  /**
   * Get featured courses
   * @param {number} limit - Number of courses
   * @returns {Promise<Array>}
   */
  async getFeaturedCourses(limit = 6) {
    return await courseRepository.getFeatured(limit);
  }

  /**
   * Get popular courses
   * @param {number} limit - Number of courses
   * @returns {Promise<Array>}
   */
  async getPopularCourses(limit = 6) {
    return await courseRepository.getPopular(limit);
  }

  /**
   * Get courses by instructor
   * @param {string} instructorId - Instructor ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>}
   */
  async getInstructorCourses(instructorId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;
    
    const courses = await courseRepository.findByInstructor(instructorId, {
      limit,
      offset,
    });
    
    return {
      courses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
      },
    };
  }

  /**
   * Get course statistics
   * @returns {Promise<Object>}
   */
  async getCourseStatistics() {
    const countByStatus = await courseRepository.getCountByStatus();
    return countByStatus;
  }
}

export default new CourseService();
