/* eslint-disable no-console */
import { Router } from 'express';
import { randomUUID } from 'crypto';
import { and, desc, eq } from 'drizzle-orm';
import PDFDocument from 'pdfkit';
import { db } from '../db/index.js';
import { certifications, users, courses } from '../db/schema.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { sendCertificateIssuedEmail } from '../services/email.js';

const router = Router();

// Allow authenticated users to access routes, specific permissions checked in handlers
router.use(authenticateToken);

const toISODate = (value) => {
  if (!value) return value;
  if (value instanceof Date) return value.toISOString();
  try {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  } catch {
    // ignore parse error
  }
  return value;
};

const clamp = (value, min, max) => {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
};

const toNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const toObject = (value) => {
  if (!value) return {};
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
};

const sanitizeTaskProgress = (progress = {}, reviewer = {}) => {
  const source = toObject(progress);

  const toInt = (raw, fallback = 0) => {
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(0, parsed);
  };

  const totalTasks = toInt(source.totalTasks ?? source.total ?? 0, 0);
  const completedRaw = toInt(source.completedTasks ?? source.completed ?? 0, 0);
  const completedTasks = totalTasks > 0 ? Math.min(totalTasks, completedRaw) : completedRaw;

  const completionFromCount = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const completionSource = Number(source.completionPercentage ?? source.percent ?? completionFromCount);
  const completionPercentage = clamp(Number.isFinite(completionSource) ? completionSource : completionFromCount, 0, 100);

  const validated = Boolean(source.validated ?? source.isValidated ?? false);
  const manualNotes = typeof source.manualNotes === 'string' ? source.manualNotes.trim().slice(0, 2000) || null : null;
  const validatedAt = validated ? toISODate(source.validatedAt) || new Date().toISOString() : null;
  const validatedBy = validated
    ? source.validatedBy || reviewer?.id || reviewer?.email || reviewer?.uid || reviewer?.userId || null
    : null;

  return {
    totalTasks,
    completedTasks,
    completionPercentage: Number(completionPercentage.toFixed(2)),
    validated,
    manualNotes,
    validatedAt,
    validatedBy,
  };
};

const normalizeCertification = (record) => {
  if (!record) return null;

  const metadataValue = toObject(record.metadata);
  const taskProgressValue = sanitizeTaskProgress(record.taskProgress, {
    validatedBy: record.taskProgress?.validatedBy,
  });

  const normalized = {
    ...record,
    overallScore: toNumber(record.overallScore, 0),
    completionPercentage: toNumber(record.completionPercentage, 0),
    issuedAt: toISODate(record.issuedAt),
    expiresAt: toISODate(record.expiresAt),
    reviewedAt: toISODate(record.reviewedAt),
    createdAt: toISODate(record.createdAt),
    updatedAt: toISODate(record.updatedAt),
    validated: Boolean(record.validated),
    taskProgress: taskProgressValue,
    metadata: metadataValue && Object.keys(metadataValue).length > 0 ? metadataValue : null,
  };

  normalized.completionPercentage = toNumber(
    normalized.completionPercentage || taskProgressValue.completionPercentage,
    taskProgressValue.completionPercentage,
  );

  return normalized;
};

const buildFilters = (query = {}, user = {}) => {
  const clauses = [];

  // Security: If not admin, FORCE userId filter to current user
  if (!user.isAdmin) {
    clauses.push(eq(certifications.userId, String(user.id)));
  } else if (query.userId) {
    // If admin and requested specific user
    clauses.push(eq(certifications.userId, String(query.userId)));
  }

  if (query.courseId) {
    clauses.push(eq(certifications.courseId, String(query.courseId)));
  }
  if (query.status) {
    clauses.push(eq(certifications.status, String(query.status).toUpperCase()));
  }
  return clauses;
};

router.get('/', async (req, res) => {
  try {
    const { limit, ...filters } = req.query || {};
    const whereClauses = buildFilters(filters, req.user);

    let query = db.select().from(certifications).orderBy(desc(certifications.createdAt));
    if (whereClauses.length === 1) {
      query = query.where(whereClauses[0]);
    } else if (whereClauses.length > 1) {
      query = query.where(and(...whereClauses));
    }

    const numericLimit = Number.parseInt(limit, 10);
    if (Number.isFinite(numericLimit) && numericLimit > 0) {
      query = query.limit(numericLimit);
    }

    const rows = await query;
    res.json(rows.map(normalizeCertification));
  } catch (error) {
    console.error('List certifications error:', error);
    res.status(500).json({ error: 'Failed to fetch certifications' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [record] = await db
      .select()
      .from(certifications)
      .where(eq(certifications.id, req.params.id))
      .limit(1);

    if (!record) {
      return res.status(404).json({ error: 'Certification not found' });
    }

    // Security check: Must be owner or admin
    if (record.userId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json(normalizeCertification(record));
  } catch (error) {
    console.error('Get certification error:', error);
    res.status(500).json({ error: 'Failed to fetch certification' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const {
      userId,
      courseId,
      enrollmentId,
      status = 'PENDING',
      overallScore = 0,
      completionPercentage = 0,
      taskProgress = {},
      validated = false,
      reviewerNotes = null,
      certificateUrl = null,
      issuedAt = null,
      expiresAt = null,
      issuedBy = null,
      metadata = null,
    } = req.body || {};

    if (!userId || !courseId) {
      return res.status(400).json({ error: 'userId and courseId are required' });
    }

    const reviewer = req.user || {};
    const sanitizedTaskProgress = sanitizeTaskProgress(taskProgress, reviewer);

    const now = new Date();
    const statusUpper = String(status).toUpperCase();
    const numericScore = clamp(Number(overallScore) || 0, 0, 100);
    const numericCompletion = clamp(Number(completionPercentage) || sanitizedTaskProgress.completionPercentage, 0, 100);
    const finalValidated = Boolean(validated || sanitizedTaskProgress.validated || numericCompletion >= 90);

    const resolvedIssuedAt = issuedAt ? new Date(issuedAt) : (statusUpper === 'ISSUED' ? now : null);
    const resolvedIssuedBy = issuedBy || reviewer?.id || reviewer?.email || reviewer?.uid || (statusUpper === 'ISSUED' ? 'admin' : null);

    const record = {
      id: randomUUID(),
      userId: String(userId),
      courseId: String(courseId),
      enrollmentId: enrollmentId ? String(enrollmentId) : null,
      status: statusUpper,
      overallScore: numericScore,
      completionPercentage: numericCompletion,
      taskProgress: { ...sanitizedTaskProgress, validated: finalValidated },
      validated: finalValidated,
      reviewerNotes: reviewerNotes || null,
      certificateUrl: certificateUrl || null,
      issuedAt: resolvedIssuedAt,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      issuedBy: resolvedIssuedBy,
      reviewedBy: finalValidated ? (sanitizedTaskProgress.validatedBy || reviewer?.id || reviewer?.email || reviewer?.uid || null) : null,
      reviewedAt: finalValidated ? now : null,
      metadata: metadata ?? null,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(certifications).values(record).execute();

    const [created] = await db
      .select()
      .from(certifications)
      .where(eq(certifications.id, record.id))
      .limit(1);

    res.status(201).json(normalizeCertification(created));
  } catch (error) {
    console.error('Create certification error:', error);
    res.status(500).json({ error: 'Failed to create certification' });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const certificationId = req.params.id;
    const [existing] = await db
      .select()
      .from(certifications)
      .where(eq(certifications.id, certificationId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Certification not found' });
    }

    // PROTECTION: Once a certificate is ISSUED, it cannot be re-issued or have critical fields modified
    // This ensures the unique ID and issue date remain fixed
    if (existing.status === 'ISSUED') {
      const { status } = req.body || {};
      // Only allow minor metadata updates on ISSUED certificates, not status changes
      if (status && status.toUpperCase() !== 'ISSUED') {
        return res.status(400).json({
          error: 'Cannot modify an already issued certificate. The certificate ID and status are locked.'
        });
      }
      // Allow only metadata and notes updates for record-keeping
      const allowedFields = ['reviewerNotes', 'metadata', 'certificateUrl'];
      const requestedFields = Object.keys(req.body || {});
      const hasDisallowedFields = requestedFields.some(field =>
        !allowedFields.includes(field) && req.body[field] !== undefined
      );

      if (hasDisallowedFields && requestedFields.some(f => !['reviewerNotes', 'metadata', 'certificateUrl'].includes(f))) {
        console.log(`Attempted to modify locked ISSUED certificate ${existing.id}. Only metadata updates allowed.`);
      }
    }

    const {
      status,
      overallScore,
      completionPercentage,
      taskProgress,
      validated,
      reviewerNotes,
      certificateUrl,
      issuedAt,
      expiresAt,
      issuedBy,
      metadata,
    } = req.body || {};

    const updates = { updatedAt: new Date() };

    if (status !== undefined) {
      updates.status = String(status).toUpperCase();
    }
    if (overallScore !== undefined) {
      updates.overallScore = clamp(Number(overallScore) || 0, 0, 100);
    }
    if (completionPercentage !== undefined) {
      updates.completionPercentage = clamp(Number(completionPercentage) || 0, 0, 100);
    }
    if (reviewerNotes !== undefined) {
      updates.reviewerNotes = reviewerNotes || null;
    }
    if (certificateUrl !== undefined) {
      updates.certificateUrl = certificateUrl || null;
    }
    if (issuedAt !== undefined) {
      updates.issuedAt = issuedAt ? new Date(issuedAt) : null;
    }
    if (expiresAt !== undefined) {
      updates.expiresAt = expiresAt ? new Date(expiresAt) : null;
    }
    if (issuedBy !== undefined) {
      updates.issuedBy = issuedBy || null;
    }
    if (metadata !== undefined) {
      updates.metadata = metadata;
    }

    if (taskProgress !== undefined || validated !== undefined) {
      const reviewer = req.user || {};
      const sanitized = sanitizeTaskProgress(taskProgress ?? existing.taskProgress, reviewer);
      const finalValidated = validated !== undefined
        ? Boolean(validated)
        : Boolean(taskProgress?.validated) || sanitized.validated;

      updates.taskProgress = { ...sanitized, validated: finalValidated };
      updates.validated = finalValidated;
      updates.completionPercentage = clamp(
        updates.completionPercentage ?? sanitized.completionPercentage,
        0,
        100,
      );
      updates.reviewedBy = finalValidated
        ? sanitized.validatedBy || req.user?.id || req.user?.email || req.user?.uid || existing.reviewedBy || null
        : null;
      updates.reviewedAt = finalValidated ? new Date() : null;
    }

    const nextStatus = updates.status || existing.status;
    if (nextStatus === 'ISSUED') {
      if (updates.issuedAt === undefined) {
        updates.issuedAt = existing.issuedAt ? new Date(existing.issuedAt) : new Date();
      }
      if (updates.issuedBy === undefined) {
        updates.issuedBy = existing.issuedBy
          || req.user?.id
          || req.user?.email
          || req.user?.uid
          || 'admin';
      }
    }

    await db
      .update(certifications)
      .set(updates)
      .where(eq(certifications.id, certificationId))
      .execute();

    const [updated] = await db
      .select()
      .from(certifications)
      .where(eq(certifications.id, certificationId))
      .limit(1);

    // Send email notification when certificate is newly issued
    const wasNotIssued = existing.status !== 'ISSUED';
    const isNowIssued = nextStatus === 'ISSUED';

    if (wasNotIssued && isNowIssued) {
      try {
        // Fetch user details for the email
        const [certUser] = await db.select().from(users)
          .where(eq(users.id, updated.userId))
          .limit(1);

        if (certUser?.email) {
          const courseTitle = updated.metadata?.courseTitle || 'your course';
          const emailResult = await sendCertificateIssuedEmail({
            email: certUser.email,
            userName: certUser.displayName || certUser.firstName || 'Graduate',
            courseTitle,
            certificateId: updated.id,
          });

          if (emailResult.success) {
            console.log(`[Certificate] Email sent to ${certUser.email} for certificate: ${updated.id}`);
          } else if (!emailResult.skipped) {
            console.warn(`[Certificate] Failed to send email: ${emailResult.message}`);
          }
        }
      } catch (emailError) {
        // Don't fail the update if email fails
        console.error('[Certificate] Email error:', emailError.message);
      }
    }

    res.json(normalizeCertification(updated));
  } catch (error) {
    console.error('Update certification error:', error);
    res.status(500).json({ error: 'Failed to update certification' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const certificationId = req.params.id;

    const [existing] = await db.select().from(certifications).where(eq(certifications.id, certificationId)).limit(1);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    await db.delete(certifications).where(eq(certifications.id, certificationId)).execute();

    res.status(204).send();
  } catch (error) {
    console.error('Delete certification error:', error);
    res.status(500).json({ error: 'Failed to delete certification' });
  }
});

/**
 * Generate and download certificate PDF
 * GET /api/certifications/:id/pdf
 */
router.get('/:id/pdf', async (req, res) => {
  try {
    const certificationId = req.params.id;
    
    // Get certification with user and course data
    const [certRecord] = await db
      .select()
      .from(certifications)
      .where(eq(certifications.id, certificationId))
      .limit(1);

    if (!certRecord) {
      return res.status(404).json({ error: 'Certification not found' });
    }

    // Security check: Must be owner or admin
    if (certRecord.userId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Not authorized to download this certificate' });
    }

    // Only allow download of ISSUED certificates
    if (certRecord.status !== 'ISSUED') {
      return res.status(400).json({ error: 'Certificate has not been issued yet' });
    }

    // Get user details
    const [certUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, certRecord.userId))
      .limit(1);

    // Get course details
    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, certRecord.courseId))
      .limit(1);

    // Extract metadata
    const metadata = toObject(certRecord.metadata);
    const studentName = certUser?.displayName || certUser?.firstName 
      ? `${certUser.firstName || ''} ${certUser.lastName || ''}`.trim()
      : metadata.recipientName || 'Student';
    const courseName = course?.title || metadata.courseTitle || metadata.courseName || 'Course';
    const instructor = course?.instructor || metadata.instructor || 'JNTU-GV Faculty';
    const completionDate = certRecord.issuedAt || certRecord.createdAt || new Date();
    const score = certRecord.overallScore || metadata.score || null;
    const grade = metadata.grade || scoreToGrade(score);

    // Generate PDF
    const pdfBuffer = await generateCertificatePDF({
      certificateId: certificationId,
      studentName,
      courseName,
      completionDate,
      instructor,
      score,
      grade,
      duration: course?.duration || metadata.duration || null,
    });

    // Set response headers for PDF download
    const sanitizedName = studentName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
    const fileName = `JNTUGV_Certificate_${sanitizedName}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Generate PDF error:', error);
    res.status(500).json({ error: 'Failed to generate certificate PDF' });
  }
});

/**
 * Helper: Convert score to grade
 */
const scoreToGrade = (score) => {
  const numericScore = Number(score ?? 0);
  if (Number.isNaN(numericScore) || numericScore === 0) return 'Pass';
  if (numericScore >= 90) return 'Excellent';
  if (numericScore >= 75) return 'Very Good';
  if (numericScore >= 60) return 'Good';
  return 'Pass';
};

/**
 * Helper: Format date for certificate
 */
const formatCertDate = (date) => {
  const d = new Date(date);
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return d.toLocaleDateString('en-US', options);
};

/**
 * Generate Certificate PDF using PDFKit
 */
const generateCertificatePDF = async ({
  certificateId,
  studentName,
  courseName,
  completionDate,
  instructor,
  score,
  grade,
  duration,
}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 40, bottom: 40, left: 50, right: 50 },
        info: {
          Title: `Certificate - ${courseName}`,
          Author: 'JNTU-GV NxtGen Certification',
          Subject: 'Course Completion Certificate',
        },
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;

      // Background
      doc.rect(0, 0, pageWidth, pageHeight).fill('#FAFBFC');
      
      // Decorative border - JNTU-GV blue
      doc.rect(20, 20, pageWidth - 40, pageHeight - 40)
        .lineWidth(8)
        .stroke('#004080');
      
      // Inner gold accent border
      doc.rect(30, 30, pageWidth - 60, pageHeight - 60)
        .lineWidth(2)
        .stroke('#D4AF37');

      // Corner decorations
      const corners = [
        { x: 40, y: 40 },
        { x: pageWidth - 70, y: 40 },
        { x: 40, y: pageHeight - 70 },
        { x: pageWidth - 70, y: pageHeight - 70 },
      ];
      corners.forEach(({ x, y }) => {
        doc.rect(x, y, 30, 30).lineWidth(1).stroke('#D4AF37');
      });

      // Header
      let yPos = 60;
      doc.fontSize(16)
        .font('Helvetica-Bold')
        .fillColor('#004080')
        .text('JNTU-GV', 0, yPos, { align: 'center' });
      
      yPos += 20;
      doc.fontSize(10)
        .font('Helvetica')
        .fillColor('#666666')
        .text('Jawaharlal Nehru Technological University - Gurajada Vishakhapatnam', 0, yPos, { align: 'center' });

      // Certificate Title
      yPos += 45;
      doc.fontSize(38)
        .font('Helvetica-Bold')
        .fillColor('#004080')
        .text('CERTIFICATE', 0, yPos, { align: 'center' });
      
      yPos += 45;
      doc.fontSize(18)
        .font('Helvetica')
        .fillColor('#666666')
        .text('OF COMPLETION', 0, yPos, { align: 'center' });

      // Decorative line
      yPos += 30;
      const lineWidth = 200;
      doc.moveTo((pageWidth - lineWidth) / 2, yPos)
        .lineTo((pageWidth + lineWidth) / 2, yPos)
        .lineWidth(2)
        .stroke('#D4AF37');

      // Main content
      yPos += 25;
      doc.fontSize(14)
        .font('Helvetica')
        .fillColor('#333333')
        .text('This is to certify that', 0, yPos, { align: 'center' });

      // Student Name
      yPos += 30;
      doc.fontSize(28)
        .font('Helvetica-Bold')
        .fillColor('#004080')
        .text(studentName, 0, yPos, { align: 'center' });

      // Underline for name
      yPos += 35;
      const nameWidth = 300;
      doc.moveTo((pageWidth - nameWidth) / 2, yPos)
        .lineTo((pageWidth + nameWidth) / 2, yPos)
        .lineWidth(1)
        .stroke('#D4AF37');

      yPos += 15;
      doc.fontSize(14)
        .font('Helvetica')
        .fillColor('#333333')
        .text('has successfully completed the course', 0, yPos, { align: 'center' });

      // Course Name
      yPos += 30;
      doc.fontSize(22)
        .font('Helvetica-Bold')
        .fillColor('#004080')
        .text(`"${courseName}"`, 0, yPos, { align: 'center' });

      // Course details
      yPos += 35;
      let detailsText = `Completed on: ${formatCertDate(completionDate)}`;
      if (duration) detailsText += `  |  Duration: ${duration} hours`;
      if (score !== null && score > 0) detailsText += `  |  Score: ${score}%`;
      
      doc.fontSize(11)
        .font('Helvetica')
        .fillColor('#666666')
        .text(detailsText, 0, yPos, { align: 'center' });

      // Signature section
      yPos += 55;
      
      // Left signature (Instructor)
      const leftX = 150;
      doc.moveTo(leftX, yPos).lineTo(leftX + 150, yPos).lineWidth(1).stroke('#333333');
      doc.fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#333333')
        .text(instructor, leftX, yPos + 10, { width: 150, align: 'center' });
      doc.fontSize(10)
        .font('Helvetica')
        .fillColor('#666666')
        .text('Course Instructor', leftX, yPos + 25, { width: 150, align: 'center' });

      // Right signature (Director)
      const rightX = pageWidth - 300;
      doc.moveTo(rightX, yPos).lineTo(rightX + 150, yPos).lineWidth(1).stroke('#333333');
      doc.fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#333333')
        .text('Dr. A. Srinivasa Rao', rightX, yPos + 10, { width: 150, align: 'center' });
      doc.fontSize(10)
        .font('Helvetica')
        .fillColor('#666666')
        .text('Director, JNTU-GV', rightX, yPos + 25, { width: 150, align: 'center' });

      // Footer
      yPos = pageHeight - 75;
      doc.fontSize(9)
        .font('Helvetica')
        .fillColor('#888888')
        .text(`Certificate ID: ${certificateId}`, 60, yPos, { align: 'left' });
      
      doc.text(`Grade: ${grade}`, pageWidth - 150, yPos, { align: 'right' });

      yPos += 15;
      doc.fontSize(8)
        .fillColor('#666666')
        .text('Verify this certificate at: https://certification.jntugv.edu.in/verify', 0, yPos, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

export default router;