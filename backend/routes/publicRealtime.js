/* eslint-disable no-console */
import { Router } from 'express';
import { db } from '../db/index.js';
import { courses, enrollments, payments, coupons } from '../db/schema.js';
import { desc } from 'drizzle-orm';

const router = Router();

const safeJsonArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    if (typeof value === 'string') {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    // ignore
  }
  return [];
};

router.get('/', async (req, res) => {
  try {
    const [publishedCourses, recentEnrollments, capturedPayments, activeCoupons] = await Promise.all([
      db.select().from(courses).orderBy(desc(courses.createdAt)),
      db.select().from(enrollments).orderBy(desc(enrollments.enrolledAt)).limit(25),
      db.select().from(payments).orderBy(desc(payments.createdAt)).limit(25),
      db.select().from(coupons).orderBy(desc(coupons.createdAt)),
    ]);

    const filteredCourses = publishedCourses.filter((course) => course.isPublished !== false);
    const featuredCourses = filteredCourses.filter((course) => course.isFeatured);

    const normalizedCoupons = activeCoupons
      .filter((coupon) => coupon.isActive !== false)
      .map((coupon) => ({
        ...coupon,
        applicableCourses: safeJsonArray(coupon.applicableCourses),
        applicableCategories: safeJsonArray(coupon.applicableCategories),
      }));

    const stats = {
      totalCourses: filteredCourses.length,
      featuredCourses: featuredCourses.length,
      totalEnrollments: recentEnrollments.length,
      totalCapturedPayments: capturedPayments.filter((payment) => (payment.status || '').toLowerCase() === 'captured').length,
      activeCoupons: normalizedCoupons.length,
    };

    res.json({
      courses: filteredCourses,
      featured: featuredCourses,
      enrollments: recentEnrollments,
      payments: capturedPayments,
      coupons: normalizedCoupons,
      stats,
    });
  } catch (error) {
    if (error?.code === 'ER_NO_SUCH_TABLE') {
      console.warn('Public realtime requested before tables existed, returning empty payload');
      return res.json({
        courses: [],
        featured: [],
        enrollments: [],
        payments: [],
        coupons: [],
        stats: {
          totalCourses: 0,
          featuredCourses: 0,
          totalEnrollments: 0,
          totalCapturedPayments: 0,
          activeCoupons: 0,
        },
      });
    }
    console.error('Public realtime error:', error);
    res.status(500).json({ error: 'Failed to fetch public realtime data' });
  }
});

export default router;
