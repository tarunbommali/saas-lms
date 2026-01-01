/* eslint-disable no-console */
import { Router } from 'express';
import { randomUUID } from 'crypto';
import { and, eq, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { enrollments, certifications, users } from '../db/schema.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { sendEnrollmentEmail } from '../services/email.js';
import { validateBody, validateUUID } from '../middleware/validation.middleware.js';
import { CreateEnrollmentDTO } from '../dto/index.js';

const router = Router();

const toISODate = (value) => {
  if (!value) return value;
  if (value instanceof Date) return value.toISOString();
  try {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  } catch {
    // Ignore parse error and return original value
  }
  return value;
};

const sanitizeTaskProgress = (rawProgress = {}, { fallback = {}, reviewer } = {}) => {
  const source = rawProgress && typeof rawProgress === 'object' ? rawProgress : {};
  const previous = fallback && typeof fallback === 'object' ? fallback : {};

  const toInt = (value, defaultValue = 0) => {
    const num = Number.parseInt(value, 10);
    if (!Number.isFinite(num)) return defaultValue;
    return Math.max(0, num);
  };

  const totalTasks = toInt(source.totalTasks ?? source.total ?? previous.totalTasks ?? 0);
  const completedTasksRaw = toInt(source.completedTasks ?? source.completed ?? previous.completedTasks ?? 0);
  const completedTasks = Math.min(totalTasks, completedTasksRaw);

  const completionFromCount = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const completionSource = Number(source.completionPercentage ?? previous.completionPercentage ?? completionFromCount);
  const completionPercentage = Number.isFinite(completionSource)
    ? Math.max(0, Math.min(100, completionSource))
    : Math.max(0, Math.min(100, completionFromCount));

  const validated = Boolean(source.validated ?? source.manualValidation ?? previous.validated ?? false);
  const manualNotesValue = source.manualNotes ?? previous.manualNotes ?? null;
  const manualNotes = typeof manualNotesValue === 'string'
    ? manualNotesValue.trim().slice(0, 2000) || null
    : null;

  const providedValidatedAt = source.validatedAt ?? previous.validatedAt ?? null;
  const validatedAt = validated
    ? toISODate(providedValidatedAt) || new Date().toISOString()
    : null;

  const validatedBy = validated
    ? (source.validatedBy || reviewer?.id || reviewer?.email || reviewer?.uid || previous.validatedBy || null)
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

const normalizeEnrollment = (record) => {
  if (!record) return null;

  const paymentDetails = record.billingInfo || record.paymentDetails || {};
  const paidAmount = Number(
    paymentDetails.amountPaid ?? paymentDetails.amount ?? record.amount ?? 0
  );

  const taskProgress = sanitizeTaskProgress(record.taskProgress, {
    fallback: record.taskProgress,
  });

  const normalized = {
    ...record,
    enrolledAt: toISODate(record.enrolledAt),
    completedAt: toISODate(record.completedAt),
    updatedAt: toISODate(record.updatedAt),
    paymentDetails,
    paidAmount,
    taskProgress,
    certificateUnlockedAt: toISODate(record.certificateUnlockedAt),
    certificateDownloadable: Boolean(record.certificateDownloadable),
  };

  delete normalized.billingInfo;
  return normalized;
};

router.get('/my-enrollments', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const rows = await db.select().from(enrollments)
      .where(eq(enrollments.userId, req.user.id));

    res.json(rows.map(normalizeEnrollment));
  } catch (error) {
    console.error('Get enrollments error:', error);
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const requestedUserId = req.params.userId === 'me' ? req.user.id : req.params.userId;
    if (requestedUserId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const statusFilter = req.query.status ? String(req.query.status).toUpperCase() : null;
    const rows = await db.select().from(enrollments)
      .where(eq(enrollments.userId, requestedUserId));

    const filtered = statusFilter
      ? rows.filter((row) => (row.status || '').toUpperCase() === statusFilter)
      : rows;

    res.json(filtered.map(normalizeEnrollment));
  } catch (error) {
    console.error('Get user enrollments error:', error);
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

router.get('/user/:userId/stats', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const requestedUserId = req.params.userId === 'me' ? req.user.id : req.params.userId;
    if (requestedUserId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const rows = await db.select().from(enrollments)
      .where(eq(enrollments.userId, requestedUserId));

    const formatted = rows.map(normalizeEnrollment);
    const successful = formatted.filter((item) => (item.status || '').toUpperCase() === 'SUCCESS');

    const totalEnrollments = successful.length;
    const offlineEnrollments = successful.filter((item) => (item.paymentDetails?.method || '').toLowerCase() === 'offline').length;
    const onlineEnrollments = successful.filter((item) => (item.paymentDetails?.method || '').toLowerCase() === 'online').length;
    const freeEnrollments = successful.filter((item) => (
      (item.paymentDetails?.method || '').toLowerCase() === 'free'
      || Number(item.paidAmount || 0) === 0
    )).length;

    res.json({
      totalEnrollments,
      offlineEnrollments,
      onlineEnrollments,
      freeEnrollments,
      enrollments: formatted,
    });
  } catch (error) {
    console.error('Get user enrollment stats error:', error);
    res.status(500).json({ error: 'Failed to fetch enrollment stats' });
  }
});

router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, userId, courseId, limit } = req.query || {};

    const filters = [];
    if (userId) {
      filters.push(eq(enrollments.userId, userId));
    }
    if (courseId) {
      filters.push(eq(enrollments.courseId, courseId));
    }
    if (status) {
      filters.push(eq(enrollments.status, String(status).toUpperCase()));
    }

    let query = db.select().from(enrollments).orderBy(desc(enrollments.enrolledAt));
    if (filters.length === 1) {
      query = query.where(filters[0]);
    } else if (filters.length > 1) {
      query = query.where(and(...filters));
    }

    const numericLimit = Number.parseInt(limit, 10);
    if (Number.isFinite(numericLimit) && numericLimit > 0) {
      query = query.limit(numericLimit);
    }

    const rows = await query;
    res.json(rows.map(normalizeEnrollment));
  } catch (error) {
    console.error('Admin enrollments list error:', error);
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

router.get('/record/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [record] = await db.select().from(enrollments)
      .where(eq(enrollments.id, req.params.id)).limit(1);

    if (!record) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    res.json(normalizeEnrollment(record));
  } catch (error) {
    console.error('Admin get enrollment error:', error);
    res.status(500).json({ error: 'Failed to fetch enrollment' });
  }
});

router.get('/:courseId', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const [record] = await db.select().from(enrollments)
      .where(and(
        eq(enrollments.userId, req.user.id),
        eq(enrollments.courseId, req.params.courseId),
      ))
      .limit(1);

    res.json(normalizeEnrollment(record) || null);
  } catch (error) {
    console.error('Get enrollment error:', error);
    res.status(500).json({ error: 'Failed to fetch enrollment' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { courseId, paymentData = {}, enrolledBy, ...enrollmentData } = req.body || {};
    if (!courseId) {
      return res.status(400).json({ error: 'courseId is required' });
    }

    const requestedUserId = enrollmentData.userId && enrollmentData.userId !== req.user.id
      ? (req.user.isAdmin ? enrollmentData.userId : null)
      : req.user.id;

    if (!requestedUserId) {
      return res.status(403).json({ error: 'Not authorized to enroll this user' });
    }

    const [existing] = await db.select().from(enrollments)
      .where(and(
        eq(enrollments.userId, requestedUserId),
        eq(enrollments.courseId, courseId),
      ))
      .limit(1);

    if (existing) {
      return res.status(400).json({ error: 'Already enrolled in this course' });
    }

    const enrollmentId = randomUUID();
    const status = (enrollmentData.status || 'SUCCESS').toUpperCase();
    const paymentMethod = (paymentData.method || '').toLowerCase();
    const resolvedAmount = Number(paymentData.amount ?? paymentData.amountPaid ?? enrollmentData.coursePrice ?? 0);

    const baseTaskProgress = sanitizeTaskProgress(enrollmentData.taskProgress, {
      reviewer: req.user,
    });
    const certificateDownloadable = baseTaskProgress.validated && baseTaskProgress.completionPercentage >= 90;

    const values = {
      id: enrollmentId,
      userId: requestedUserId,
      courseId,
      status,
      courseTitle: enrollmentData.courseTitle,
      enrolledAt: enrollmentData.enrollmentDate ? new Date(enrollmentData.enrollmentDate) : new Date(),
      completedAt: enrollmentData.completedAt ? new Date(enrollmentData.completedAt) : null,
      paymentId: paymentData.paymentId,
      amount: resolvedAmount,
      currency: paymentData.currency || enrollmentData.currency || 'INR',
      couponCode: paymentData.couponCode || enrollmentData.couponCode,
      couponDiscount: Number(paymentData.couponDiscount ?? enrollmentData.couponDiscount ?? 0),
      billingInfo: {
        ...paymentData,
        amountPaid: resolvedAmount,
        method: paymentMethod || (status === 'SUCCESS' ? 'offline' : 'online'),
        enrolledBy: enrolledBy || (req.user.isAdmin ? 'admin' : 'user'),
      },
      taskProgress: baseTaskProgress,
      certificateDownloadable,
      certificateUnlockedAt: certificateDownloadable ? new Date() : null,
    };

    if (enrollmentData.progress !== undefined) {
      values.progress = enrollmentData.progress;
    }

    if (enrollmentData.moduleProgress !== undefined) {
      values.moduleProgress = enrollmentData.moduleProgress;
    }

    await db.insert(enrollments).values(values).execute();

    const [created] = await db.select().from(enrollments)
      .where(eq(enrollments.id, enrollmentId))
      .limit(1);

    // Send enrollment email if admin enrolled a different user
    const isAdminEnrollingUser = req.user.isAdmin && requestedUserId !== req.user.id;
    if (isAdminEnrollingUser && status === 'SUCCESS') {
      try {
        // Fetch user details for the email
        const [enrolledUser] = await db.select().from(users)
          .where(eq(users.id, requestedUserId))
          .limit(1);

        if (enrolledUser?.email) {
          const emailResult = await sendEnrollmentEmail({
            email: enrolledUser.email,
            userName: enrolledUser.displayName || enrolledUser.firstName || 'Student',
            courseTitle: enrollmentData.courseTitle || 'a new course',
            enrolledBy: req.user.displayName || req.user.email || 'Admin',
          });

          if (emailResult.success) {
            console.log(`[Enrollment] Email sent to ${enrolledUser.email} for course: ${enrollmentData.courseTitle}`);
          } else if (!emailResult.skipped) {
            console.warn(`[Enrollment] Failed to send email: ${emailResult.message}`);
          }
        }
      } catch (emailError) {
        // Don't fail the enrollment if email fails
        console.error('[Enrollment] Email error:', emailError.message);
      }
    }

    res.status(201).json(normalizeEnrollment(created));
  } catch (error) {
    console.error('Create enrollment error:', error);
    res.status(500).json({ error: 'Failed to create enrollment' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const [existing] = await db.select().from(enrollments)
      .where(eq(enrollments.id, req.params.id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    if (existing.userId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updates = { ...req.body };

    if (updates.status) {
      updates.status = String(updates.status).toUpperCase();
    }

    if (updates.paidAmount !== undefined) {
      updates.amount = Number(updates.paidAmount);
      delete updates.paidAmount;
    }

    if (updates.paymentDetails) {
      updates.billingInfo = {
        ...existing.billingInfo,
        ...updates.paymentDetails,
      };
      delete updates.paymentDetails;
    }

    // START of modified logic for certification triggers
    let shouldTriggerCertification = false;
    let finalCompletionPercentage = 0;

    // Handle Task Progress (Manual/Admin tasks)
    if (updates.taskProgress) {
      const sanitizedProgress = sanitizeTaskProgress(updates.taskProgress, {
        fallback: existing.taskProgress,
        reviewer: req.user,
      });

      const certificateDownloadable = sanitizedProgress.validated && sanitizedProgress.completionPercentage >= 90;

      updates.taskProgress = sanitizedProgress;
      updates.certificateDownloadable = certificateDownloadable;
      updates.certificateUnlockedAt = certificateDownloadable
        ? (existing.certificateUnlockedAt || new Date())
        : null;

      if (sanitizedProgress.completionPercentage === 100) {
        shouldTriggerCertification = true;
        finalCompletionPercentage = 100;
      }
    }

    // Handle Video Progress (Frontend calculated percentage)
    // LearnPage sends 'completionPercentage' at the root level
    if (updates.completionPercentage !== undefined) {
      const vidCompletion = Number(updates.completionPercentage);
      if (Number.isFinite(vidCompletion) && vidCompletion === 100) {
        shouldTriggerCertification = true;
        finalCompletionPercentage = 100;
        // If video is 100% complete, we might want to unlock certificate even if tasks aren't present
        // (depending on business rules, but assuming 100% video is sufficient for automated finish)
        if (!updates.certificateDownloadable && !existing.certificateDownloadable) {
          updates.certificateDownloadable = true;
          updates.certificateUnlockedAt = new Date();
        }
      }
    }

    // IMPORTANT: Create PENDING certification ONLY ONCE per user per course
    // If a certification already exists (PENDING or ISSUED), we NEVER create another
    // This ensures each user gets exactly ONE unique certificate ID per course
    if (shouldTriggerCertification) {
      const [existingCert] = await db.select().from(certifications)
        .where(and(
          eq(certifications.userId, existing.userId),
          eq(certifications.courseId, existing.courseId)
        ))
        .limit(1);

      if (existingCert) {
        // Certification already exists - do NOT create duplicate
        console.log(`Certification already exists for user ${existing.userId}, course ${existing.courseId}. ID: ${existingCert.id}, Status: ${existingCert.status}`);
      } else {
        // First-time creation only - this ID will be permanent
        const certId = randomUUID();
        await db.insert(certifications).values({
          id: certId,
          userId: existing.userId,
          courseId: existing.courseId,
          enrollmentId: existing.id,
          status: 'PENDING', // Pending Admin Review - Admin will issue with this same ID
          overallScore: 0,
          completionPercentage: finalCompletionPercentage,
          taskProgress: updates.taskProgress || existing.taskProgress || {},
          metadata: {
            userName: req.user.displayName || req.user.firstName + ' ' + (req.user.lastName || ''),
            courseTitle: existing.courseTitle,
            enrolledAt: existing.enrolledAt
          },
          createdAt: new Date(),
          updatedAt: new Date()
        }).execute();
        console.log(`Created ONE-TIME certification ${certId} for user ${existing.userId}. This ID is now fixed.`);
      }
    }
    // END of modified logic for certification triggers

    updates.updatedAt = new Date();

    await db.update(enrollments)
      .set(updates)
      .where(eq(enrollments.id, req.params.id))
      .execute();

    const [updated] = await db.select().from(enrollments)
      .where(eq(enrollments.id, req.params.id))
      .limit(1);

    res.json(normalizeEnrollment(updated));
  } catch (error) {
    console.error('Update enrollment error:', error);
    res.status(500).json({ error: 'Failed to update enrollment' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const [existing] = await db.select().from(enrollments)
      .where(eq(enrollments.id, req.params.id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    if (existing.userId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await db.delete(enrollments)
      .where(eq(enrollments.id, req.params.id))
      .execute();

    res.json({ success: true });
  } catch (error) {
    console.error('Delete enrollment error:', error);
    res.status(500).json({ error: 'Failed to delete enrollment' });
  }
});

export default router;
