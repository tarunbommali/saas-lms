/**
 * Enrollment Controller
 * Handles all enrollment-related HTTP requests
 */

import enrollmentService from '../services/enrollment.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export class EnrollmentController {
  /**
   * Enroll in course
   * POST /api/enrollments
   */
  enroll = asyncHandler(async (req, res) => {
    const { courseId } = req.body;
    
    const enrollment = await enrollmentService.enrollUser(
      req.user.id,
      courseId,
      req.body
    );
    
    res.status(201).json({
      success: true,
      message: 'Enrolled successfully',
      data: enrollment,
    });
  });

  /**
   * Get user enrollments
   * GET /api/enrollments/my-enrollments
   */
  getMyEnrollments = asyncHandler(async (req, res) => {
    const { page, limit, status } = req.query;
    
    const result = await enrollmentService.getUserEnrollments(req.user.id, {
      page,
      limit,
      status,
    });
    
    res.json({
      success: true,
      data: result.enrollments,
      meta: result.pagination,
    });
  });

  /**
   * Get enrollment details
   * GET /api/enrollments/:id
   */
  getOne = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const enrollment = await enrollmentService.getEnrollmentDetails(id, req.user.id);
    
    res.json({
      success: true,
      data: enrollment,
    });
  });

  /**
   * Update enrollment progress
   * PUT /api/enrollments/:id/progress
   */
  updateProgress = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { progress } = req.body;
    
    const enrollment = await enrollmentService.updateProgress(
      id,
      progress,
      req.user.id
    );
    
    res.json({
      success: true,
      message: 'Progress updated successfully',
      data: enrollment,
    });
  });

  /**
   * Complete enrollment
   * POST /api/enrollments/:id/complete
   */
  complete = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const enrollment = await enrollmentService.completeEnrollment(id, req.user.id);
    
    res.json({
      success: true,
      message: 'Enrollment completed successfully',
      data: enrollment,
    });
  });

  /**
   * Check if user is enrolled
   * GET /api/enrollments/check/:courseId
   */
  checkEnrollment = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    
    const isEnrolled = await enrollmentService.isUserEnrolled(
      req.user.id,
      courseId
    );
    
    res.json({
      success: true,
      data: { isEnrolled },
    });
  });

  /**
   * Get user enrollment statistics
   * GET /api/enrollments/statistics
   */
  getMyStatistics = asyncHandler(async (req, res) => {
    const stats = await enrollmentService.getUserStatistics(req.user.id);
    
    res.json({
      success: true,
      data: stats,
    });
  });

  /**
   * Get course enrollments (Admin)
   * GET /api/admin/enrollments/course/:courseId
   */
  getCourseEnrollments = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const { page, limit, status } = req.query;
    
    const result = await enrollmentService.getCourseEnrollments(courseId, {
      page,
      limit,
      status,
    });
    
    res.json({
      success: true,
      data: result.enrollments,
      meta: result.pagination,
    });
  });

  /**
   * Get recent enrollments (Admin)
   * GET /api/admin/enrollments/recent
   */
  getRecent = asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query;
    
    const enrollments = await enrollmentService.getRecentEnrollments(
      parseInt(limit)
    );
    
    res.json({
      success: true,
      data: enrollments,
    });
  });
}

export default new EnrollmentController();
