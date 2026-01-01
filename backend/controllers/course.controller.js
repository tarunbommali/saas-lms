/**
 * Course Controller
 * Handles all course-related HTTP requests
 */

import courseService from '../services/course.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export class CourseController {
  /**
   * Get all published courses
   * GET /api/courses
   */
  list = asyncHandler(async (req, res) => {
    const { page, limit, category, difficulty, search } = req.query;
    
    const result = await courseService.getPublishedCourses({
      page,
      limit,
      category,
      difficulty,
      search,
    });
    
    res.json({
      success: true,
      data: result.courses,
      meta: result.pagination,
    });
  });

  /**
   * Get course by ID or slug
   * GET /api/courses/:identifier
   */
  getOne = asyncHandler(async (req, res) => {
    const { identifier } = req.params;
    
    const course = await courseService.getCourse(identifier);
    
    res.json({
      success: true,
      data: course,
    });
  });

  /**
   * Get featured courses
   * GET /api/courses/featured
   */
  getFeatured = asyncHandler(async (req, res) => {
    const { limit = 6 } = req.query;
    
    const courses = await courseService.getFeaturedCourses(parseInt(limit));
    
    res.json({
      success: true,
      data: courses,
    });
  });

  /**
   * Get popular courses
   * GET /api/courses/popular
   */
  getPopular = asyncHandler(async (req, res) => {
    const { limit = 6 } = req.query;
    
    const courses = await courseService.getPopularCourses(parseInt(limit));
    
    res.json({
      success: true,
      data: courses,
    });
  });

  /**
   * Create new course (Admin/Instructor)
   * POST /api/admin/courses
   */
  create = asyncHandler(async (req, res) => {
    const course = await courseService.createCourse(req.body, req.user.id);
    
    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: course,
    });
  });

  /**
   * Update course (Admin/Instructor)
   * PUT /api/admin/courses/:id
   */
  update = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const course = await courseService.updateCourse(id, req.body, req.user.id);
    
    res.json({
      success: true,
      message: 'Course updated successfully',
      data: course,
    });
  });

  /**
   * Delete course (Admin/Instructor)
   * DELETE /api/admin/courses/:id
   */
  delete = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    await courseService.deleteCourse(id, req.user.id);
    
    res.json({
      success: true,
      message: 'Course deleted successfully',
    });
  });

  /**
   * Publish course (Admin/Instructor)
   * POST /api/admin/courses/:id/publish
   */
  publish = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const course = await courseService.publishCourse(id, req.user.id);
    
    res.json({
      success: true,
      message: 'Course published successfully',
      data: course,
    });
  });

  /**
   * Unpublish course (Admin/Instructor)
   * POST /api/admin/courses/:id/unpublish
   */
  unpublish = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const course = await courseService.unpublishCourse(id, req.user.id);
    
    res.json({
      success: true,
      message: 'Course unpublished successfully',
      data: course,
    });
  });

  /**
   * Get instructor courses
   * GET /api/instructor/courses
   */
  getInstructorCourses = asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    
    const result = await courseService.getInstructorCourses(req.user.id, {
      page,
      limit,
    });
    
    res.json({
      success: true,
      data: result.courses,
      meta: result.pagination,
    });
  });

  /**
   * Get course statistics (Admin)
   * GET /api/admin/courses/statistics
   */
  getStatistics = asyncHandler(async (req, res) => {
    const stats = await courseService.getCourseStatistics();
    
    res.json({
      success: true,
      data: stats,
    });
  });
}

export default new CourseController();
