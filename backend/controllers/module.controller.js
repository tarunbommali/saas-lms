/**
 * Module Controller
 * Handles course module HTTP requests
 */

import moduleService from '../services/module.service.js';
import progressService from '../services/progress.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export class ModuleController {
  /**
   * Get course modules
   * GET /api/courses/:courseId/modules
   */
  list = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const publishedOnly = !req.user?.isAdmin;
    
    const modules = await moduleService.getCourseModules(courseId, publishedOnly);
    
    // If user is enrolled, add progress data
    if (req.user) {
      const progress = await progressService.getCourseProgress(req.user.id, courseId);
      
      return res.json({
        success: true,
        data: progress.modules,
        meta: progress.summary,
      });
    }
    
    res.json({
      success: true,
      data: modules,
    });
  });

  /**
   * Get single module
   * GET /api/modules/:id
   */
  getOne = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { courseId } = req.query;
    
    if (!courseId) {
      return res.status(400).json({
        success: false,
        error: 'courseId query parameter is required',
      });
    }
    
    const module = await moduleService.getModule(id, courseId);
    
    // Check access if user is enrolled
    if (req.user) {
      const access = await progressService.checkModuleAccess(req.user.id, id);
      
      return res.json({
        success: true,
        data: {
          ...module,
          access,
        },
      });
    }
    
    res.json({
      success: true,
      data: module,
    });
  });

  /**
   * Create module (Admin/Instructor)
   * POST /api/admin/courses/:courseId/modules
   */
  create = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    
    const module = await moduleService.createModule(
      courseId,
      req.body,
      req.user.id
    );
    
    res.status(201).json({
      success: true,
      message: 'Module created successfully',
      data: module,
    });
  });

  /**
   * Update module (Admin/Instructor)
   * PUT /api/admin/modules/:id
   */
  update = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const module = await moduleService.updateModule(id, req.body, req.user.id);
    
    res.json({
      success: true,
      message: 'Module updated successfully',
      data: module,
    });
  });

  /**
   * Delete module (Admin/Instructor)
   * DELETE /api/admin/modules/:id
   */
  delete = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    await moduleService.deleteModule(id, req.user.id);
    
    res.json({
      success: true,
      message: 'Module deleted successfully',
    });
  });

  /**
   * Reorder modules (Admin/Instructor)
   * PUT /api/admin/courses/:courseId/modules/reorder
   */
  reorder = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const { moduleOrders } = req.body;
    
    await moduleService.reorderModules(courseId, moduleOrders, req.user.id);
    
    res.json({
      success: true,
      message: 'Modules reordered successfully',
    });
  });

  /**
   * Get next module
   * GET /api/modules/:id/next
   */
  getNext = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { courseId } = req.query;
    
    const nextModule = await moduleService.getNextModule(courseId, id);
    
    res.json({
      success: true,
      data: nextModule,
    });
  });

  /**
   * Get previous module
   * GET /api/modules/:id/previous
   */
  getPrevious = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { courseId } = req.query;
    
    const previousModule = await moduleService.getPreviousModule(courseId, id);
    
    res.json({
      success: true,
      data: previousModule,
    });
  });
}

export default new ModuleController();
