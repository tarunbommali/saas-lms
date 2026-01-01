/**
 * Certificate Controller
 * Handles all certificate-related HTTP requests
 */

import certificateService from '../services/certificate.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export class CertificateController {
  /**
   * Request certificate
   * POST /api/certificates/request
   */
  request = asyncHandler(async (req, res) => {
    const { enrollmentId } = req.body;
    
    const certificate = await certificateService.requestCertificate(
      req.user.id,
      enrollmentId
    );
    
    res.status(201).json({
      success: true,
      message: 'Certificate requested successfully',
      data: certificate,
    });
  });

  /**
   * Get user certificates
   * GET /api/certificates/my-certificates
   */
  getMyCertificates = asyncHandler(async (req, res) => {
    const certificates = await certificateService.getUserCertificates(
      req.user.id
    );
    
    res.json({
      success: true,
      data: certificates,
    });
  });

  /**
   * Get certificate by ID
   * GET /api/certificates/:id
   */
  getOne = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const certificate = await certificateService.getCertificateById(id);
    
    res.json({
      success: true,
      data: certificate,
    });
  });

  /**
   * Verify certificate
   * GET /api/certificates/verify/:code
   */
  verify = asyncHandler(async (req, res) => {
    const { code } = req.params;
    
    const result = await certificateService.verifyCertificate(code);
    
    res.json({
      success: result.valid,
      ...result,
    });
  });

  /**
   * Issue certificate (Admin/Institution)
   * POST /api/admin/certificates/:id/issue
   */
  issue = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const certificate = await certificateService.issueCertificate(
      id,
      req.user.id
    );
    
    res.json({
      success: true,
      message: 'Certificate issued successfully',
      data: certificate,
    });
  });

  /**
   * Revoke certificate (Admin)
   * POST /api/admin/certificates/:id/revoke
   */
  revoke = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    
    const certificate = await certificateService.revokeCertificate(
      id,
      req.user.id,
      reason
    );
    
    res.json({
      success: true,
      message: 'Certificate revoked successfully',
      data: certificate,
    });
  });

  /**
   * Get all certificates (Admin)
   * GET /api/admin/certificates
   */
  getAll = asyncHandler(async (req, res) => {
    const { page, limit, status } = req.query;
    
    const result = await certificateService.getAllCertificates({
      page,
      limit,
      status,
    });
    
    res.json({
      success: true,
      data: result.certificates,
      meta: result.pagination,
    });
  });

  /**
   * Get certificate statistics (Admin)
   * GET /api/admin/certificates/statistics
   */
  getStatistics = asyncHandler(async (req, res) => {
    const stats = await certificateService.getCertificateStatistics();
    
    res.json({
      success: true,
      data: stats,
    });
  });
}

export default new CertificateController();
