/**
 * Progress Controller
 * Handles progress tracking HTTP requests
 */

import progressService from '../services/progress.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export class ProgressController {
  /**
   * Get course progress
   * GET /api/progress/:courseId
   */
  getCourseProgress = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }
    
    const progress = await progressService.getCourseProgress(
      req.user.id,
      courseId
    );
    
    res.json({
      success: true,
      data: progress,
    });
  });

  /**
   * Check module access
   * GET /api/modules/:moduleId/access
   */
  checkAccess = asyncHandler(async (req, res) => {
    const { moduleId } = req.params;
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }
    
    const access = await progressService.checkModuleAccess(
      req.user.id,
      moduleId
    );
    
    res.json({
      success: true,
      data: access,
    });
  });

  /**
   * Update module progress
   * PUT /api/progress/:moduleId
   */
  updateProgress = asyncHandler(async (req, res) => {
    const { moduleId } = req.params;
    const progressData = req.body;
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }
    
    const progress = await progressService.updateProgress(
      req.user.id,
      moduleId,
      progressData
    );
    
    res.json({
      success: true,
      message: 'Progress updated successfully',
      data: progress,
    });
  });

  /**
   * Check certificate eligibility
   * GET /api/progress/:courseId/certificate-eligibility
   */
  checkCertificateEligibility = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }
    
    const eligibility = await progressService.canRequestCertificate(
      req.user.id,
      courseId
    );
    
    res.json({
      success: true,
      data: eligibility,
    });
  });

  /**
   * Get learning dashboard
   * GET /api/progress/dashboard
   */
  getDashboard = asyncHandler(async (req, res) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }
    
    const dashboard = await progressService.getDashboardData(req.user.id);
    
    res.json({
      success: true,
      data: dashboard,
    });
  });
}

export default new ProgressController();
