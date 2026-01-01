/**
 * Certificate Service
 * Complete certification lifecycle management
 */

import { randomUUID } from 'crypto';
import { db } from '../db/index.js';
import { certificates, enrollments, courses, users } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { generateCertificateId } from './certificate.js';

export class CertificateService {
  /**
   * Request certificate
   * @param {string} userId - User ID
   * @param {string} enrollmentId - Enrollment ID
   * @returns {Promise<Object>}
   */
  async requestCertificate(userId, enrollmentId) {
    // Get enrollment with course details
    const [enrollment] = await db
      .select()
      .from(enrollments)
      .where(eq(enrollments.id, enrollmentId))
      .limit(1);
    
    if (!enrollment) {
      throw new Error('Enrollment not found');
    }
    
    // Check ownership
    if (enrollment.userId !== userId) {
      throw new Error('You do not have permission to request this certificate');
    }
    
    // Check if enrollment is completed
    if (enrollment.status !== 'completed' || enrollment.progress < 100) {
      throw new Error('You must complete the course before requesting a certificate');
    }
    
    // Check if certificate already exists
    const [existingCert] = await db
      .select()
      .from(certificates)
      .where(
        and(
          eq(certificates.userId, userId),
          eq(certificates.enrollmentId, enrollmentId)
        )
      )
      .limit(1);
    
    if (existingCert) {
      return {
        ...existingCert,
        message: 'Certificate already exists',
      };
    }
    
    // Get course and user details
    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, enrollment.courseId))
      .limit(1);
    
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    // Generate certificate
    const certificateId = randomUUID();
    const certificateNumber = generateCertificateId();
    const verificationCode = `JNTUGV-${randomUUID().substring(0, 8).toUpperCase()}`;
    
    const certificateData = {
      recipientName: user.displayName || `${user.firstName} ${user.lastName}`,
      courseName: course.title,
      completionDate: enrollment.completedAt,
      grade: enrollment.grade,
      score: enrollment.score,
    };
    
    // Create certificate record
    await db.insert(certificates).values({
      id: certificateId,
      certificateNumber,
      userId,
      courseId: enrollment.courseId,
      enrollmentId,
      status: 'pending',
      verificationCode,
      certificateData: JSON.stringify(certificateData),
      requestedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }).execute();
    
    const [newCertificate] = await db
      .select()
      .from(certificates)
      .where(eq(certificates.id, certificateId))
      .limit(1);
    
    return newCertificate;
  }

  /**
   * Issue certificate (Admin/Institution)
   * @param {string} certificateId - Certificate ID
   * @param {string} issuedBy - User ID of issuer
   * @returns {Promise<Object>}
   */
  async issueCertificate(certificateId, issuedBy) {
    const [certificate] = await db
      .select()
      .from(certificates)
      .where(eq(certificates.id, certificateId))
      .limit(1);
    
    if (!certificate) {
      throw new Error('Certificate not found');
    }
    
    if (certificate.status === 'issued') {
      throw new Error('Certificate is already issued');
    }
    
    if (certificate.status === 'revoked') {
      throw new Error('Cannot issue a revoked certificate');
    }
    
    // Update certificate status
    await db
      .update(certificates)
      .set({
        status: 'issued',
        issuedAt: new Date(),
        issuedBy,
        updatedAt: new Date(),
      })
      .where(eq(certificates.id, certificateId))
      .execute();
    
    // Update enrollment with certificate ID
    await db
      .update(enrollments)
      .set({
        certificateId,
        certificateIssuedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(enrollments.id, certificate.enrollmentId))
      .execute();
    
    const [updatedCertificate] = await db
      .select()
      .from(certificates)
      .where(eq(certificates.id, certificateId))
      .limit(1);
    
    return updatedCertificate;
  }

  /**
   * Revoke certificate (Admin)
   * @param {string} certificateId - Certificate ID
   * @param {string} revokedBy - User ID of revoker
   * @param {string} reason - Revocation reason
   * @returns {Promise<Object>}
   */
  async revokeCertificate(certificateId, revokedBy, reason) {
    const [certificate] = await db
      .select()
      .from(certificates)
      .where(eq(certificates.id, certificateId))
      .limit(1);
    
    if (!certificate) {
      throw new Error('Certificate not found');
    }
    
    if (certificate.status === 'revoked') {
      throw new Error('Certificate is already revoked');
    }
    
    await db
      .update(certificates)
      .set({
        status: 'revoked',
        revokedAt: new Date(),
        revokedBy,
        revokeReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(certificates.id, certificateId))
      .execute();
    
    const [revokedCertificate] = await db
      .select()
      .from(certificates)
      .where(eq(certificates.id, certificateId))
      .limit(1);
    
    return revokedCertificate;
  }

  /**
   * Verify certificate
   * @param {string} verificationCode - Verification code
   * @returns {Promise<Object>}
   */
  async verifyCertificate(verificationCode) {
    const [certificate] = await db
      .select({
        certificate: certificates,
        user: users,
        course: courses,
      })
      .from(certificates)
      .leftJoin(users, eq(certificates.userId, users.id))
      .leftJoin(courses, eq(certificates.courseId, courses.id))
      .where(eq(certificates.verificationCode, verificationCode))
      .limit(1);
    
    if (!certificate) {
      return {
        valid: false,
        message: 'Certificate not found',
      };
    }
    
    if (certificate.certificate.status === 'revoked') {
      return {
        valid: false,
        message: 'Certificate has been revoked',
        reason: certificate.certificate.revokeReason,
        revokedAt: certificate.certificate.revokedAt,
      };
    }
    
    if (certificate.certificate.status !== 'issued') {
      return {
        valid: false,
        message: 'Certificate is not yet issued',
      };
    }
    
    return {
      valid: true,
      certificate: {
        certificateNumber: certificate.certificate.certificateNumber,
        recipientName: certificate.user.displayName,
        courseName: certificate.course.title,
        issuedAt: certificate.certificate.issuedAt,
        status: certificate.certificate.status,
      },
    };
  }

  /**
   * Get user certificates
   * @param {string} userId - User ID
   * @returns {Promise<Array>}
   */
  async getUserCertificates(userId) {
    const results = await db
      .select({
        certificate: certificates,
        course: courses,
      })
      .from(certificates)
      .leftJoin(courses, eq(certificates.courseId, courses.id))
      .where(eq(certificates.userId, userId))
      .execute();
    
    return results;
  }

  /**
   * Get certificate by ID
   * @param {string} certificateId - Certificate ID
   * @returns {Promise<Object>}
   */
  async getCertificateById(certificateId) {
    const [result] = await db
      .select({
        certificate: certificates,
        user: users,
        course: courses,
      })
      .from(certificates)
      .leftJoin(users, eq(certificates.userId, users.id))
      .leftJoin(courses, eq(certificates.courseId, courses.id))
      .where(eq(certificates.id, certificateId))
      .limit(1);
    
    if (!result) {
      throw new Error('Certificate not found');
    }
    
    return result;
  }

  /**
   * Get all certificates (Admin)
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>}
   */
  async getAllCertificates(filters = {}) {
    const { page = 1, limit = 10, status } = filters;
    const offset = (page - 1) * limit;
    
    let query = db
      .select({
        certificate: certificates,
        user: users,
        course: courses,
      })
      .from(certificates)
      .leftJoin(users, eq(certificates.userId, users.id))
      .leftJoin(courses, eq(certificates.courseId, courses.id));
    
    if (status) {
      query = query.where(eq(certificates.status, status));
    }
    
    const results = await query
      .limit(limit)
      .offset(offset)
      .execute();
    
    return {
      certificates: results,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
      },
    };
  }

  /**
   * Get certificate statistics
   * @returns {Promise<Object>}
   */
  async getCertificateStatistics() {
    const [stats] = await db
      .select({
        total: sql`COUNT(*)`,
        pending: sql`SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)`,
        issued: sql`SUM(CASE WHEN status = 'issued' THEN 1 ELSE 0 END)`,
        revoked: sql`SUM(CASE WHEN status = 'revoked' THEN 1 ELSE 0 END)`,
      })
      .from(certificates);
    
    return {
      total: Number(stats.total || 0),
      pending: Number(stats.pending || 0),
      issued: Number(stats.issued || 0),
      revoked: Number(stats.revoked || 0),
    };
  }
}

export default new CertificateService();
