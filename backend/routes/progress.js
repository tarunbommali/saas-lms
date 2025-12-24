import { Router } from 'express';
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { db } from '../db/index.js';
import { enrollments, certifications } from '../db/schema.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// GET /:courseId - Get user progress
router.get('/:courseId', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const [enrollment] = await db.select().from(enrollments)
            .where(and(
                eq(enrollments.userId, req.user.id),
                eq(enrollments.courseId, req.params.courseId)
            ))
            .limit(1);

        if (!enrollment) {
            return res.status(404).json({ error: 'Enrollment not found' });
        }

        res.json(enrollment.progress || {});
    } catch (error) {
        console.error('Get progress error:', error);
        res.status(500).json({ error: 'Failed to fetch progress' });
    }
});

// PUT /:courseId - Update user progress
router.put('/:courseId', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { courseId } = req.params;
        const progressUpdate = req.body;

        const [existing] = await db.select().from(enrollments)
            .where(and(
                eq(enrollments.userId, req.user.id),
                eq(enrollments.courseId, courseId)
            ))
            .limit(1);

        if (!existing) {
            return res.status(404).json({ error: 'Enrollment not found' });
        }

        // Merge logic could be here, but Frontend sends full state usually. 
        // We will trust the frontend payload for 'progress' column.

        const updates = {
            progress: progressUpdate,
            updatedAt: new Date(),
        };

        // Check completion for certification
        let shouldTriggerCertification = false;
        let finalCompletionPercentage = 0;

        if (progressUpdate && typeof progressUpdate === 'object') {
            const percentage = Number(progressUpdate.completionPercentage);
            if (Number.isFinite(percentage) && percentage >= 100) {
                shouldTriggerCertification = true;
                finalCompletionPercentage = 100;

                if (!existing.certificateDownloadable) {
                    updates.certificateDownloadable = true;
                    updates.certificateUnlockedAt = new Date();
                }
            }
        }

        await db.update(enrollments)
            .set(updates)
            .where(eq(enrollments.id, existing.id))
            .execute();

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
                // The unique ID is preserved: existingCert.id
                console.log(`Certification already exists for user ${existing.userId}, course ${existing.courseId}. ID: ${existingCert.id}, Status: ${existingCert.status}`);
            } else {
                // First-time creation only
                const certId = randomUUID();
                await db.insert(certifications).values({
                    id: certId,
                    userId: existing.userId,
                    courseId: existing.courseId,
                    enrollmentId: existing.id,
                    status: 'PENDING', // Pending Admin Review - Admin will issue with this same ID
                    overallScore: 0,
                    completionPercentage: finalCompletionPercentage,
                    taskProgress: existing.taskProgress || {},
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

        res.json(progressUpdate);
    } catch (error) {
        console.error('Update progress error:', error);
        res.status(500).json({ error: 'Failed to update progress' });
    }
});

export default router;
