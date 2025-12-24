/* eslint-disable no-console */
import { Router } from 'express';
import { db } from '../db/index.js';
import {
  users,
  courses,
  enrollments,
  payments,
  coupons,
} from '../db/schema.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
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
    // ignore parse error and fall back to []
  }
  return [];
};

const normalizeEnrollment = (record) => {
  if (!record) return null;
  const billingInfo = record.billingInfo || {};
  return {
    ...record,
    enrolledAt: record.enrolledAt ? new Date(record.enrolledAt).toISOString() : null,
    completedAt: record.completedAt ? new Date(record.completedAt).toISOString() : null,
    updatedAt: record.updatedAt ? new Date(record.updatedAt).toISOString() : null,
    paidAmount: Number(billingInfo.amountPaid ?? record.amount ?? 0),
    paymentDetails: billingInfo,
  };
};

const normalizeCoupon = (record) => {
  if (!record) return null;
  return {
    ...record,
    applicableCourses: safeJsonArray(record.applicableCourses),
    applicableCategories: safeJsonArray(record.applicableCategories),
  };
};

router.use(authenticateToken, requireAdmin);

router.get('/', async (req, res) => {
  try {
    const [coursesList, enrollmentsList, usersList, paymentsList, couponsList] = await Promise.all([
      db.select().from(courses).orderBy(desc(courses.createdAt)),
      db.select().from(enrollments).orderBy(desc(enrollments.enrolledAt)),
      db.select().from(users).orderBy(desc(users.createdAt)),
      db.select().from(payments).orderBy(desc(payments.createdAt)),
      db.select().from(coupons).orderBy(desc(coupons.createdAt)),
    ]);

    const normalizedEnrollments = enrollmentsList.map(normalizeEnrollment).filter(Boolean);
    const sanitizedUsers = usersList.map((user) => {
      const clone = { ...user };
      delete clone.password;
      return clone;
    });

    const normalizedCoupons = couponsList.map(normalizeCoupon).filter(Boolean);

    const stats = {
      totalCourses: coursesList.length,
      totalPublishedCourses: coursesList.filter((course) => course.isPublished !== false).length,
      totalUsers: usersList.length,
      totalAdmins: usersList.filter((user) => user.isAdmin).length,
      totalEnrollments: enrollmentsList.length,
      totalPayments: paymentsList.length,
      capturedPayments: paymentsList.filter((payment) => (payment.status || '').toLowerCase() === 'captured').length,
      activeCoupons: normalizedCoupons.filter((coupon) => coupon.isActive !== false).length,
    };

    res.json({
      courses: coursesList,
      enrollments: normalizedEnrollments,
      users: sanitizedUsers,
      payments: paymentsList,
      coupons: normalizedCoupons,
      stats,
    });
  } catch (error) {
    if (error?.code === 'ER_NO_SUCH_TABLE') {
      console.warn('Admin realtime requested before tables existed, returning empty payload');
      return res.json({
        courses: [],
        enrollments: [],
        users: [],
        payments: [],
        coupons: [],
        stats: {
          totalCourses: 0,
          totalPublishedCourses: 0,
          totalUsers: 0,
          totalAdmins: 0,
          totalEnrollments: 0,
          totalPayments: 0,
          capturedPayments: 0,
          activeCoupons: 0,
        },
      });
    }
    console.error('Admin realtime error:', error);
    res.status(500).json({ error: 'Failed to fetch realtime admin data' });
  }
});

export default router;
