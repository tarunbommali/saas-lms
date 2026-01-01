/* eslint-disable no-console */
import { Router } from 'express';
import { randomUUID } from 'crypto';
import { db } from '../db/index.js';
import { payments, courses, enrollments } from '../db/schema.js';
import { and, eq, desc } from 'drizzle-orm';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  createRazorpayOrder,
  verifyRazorpaySignature,
  calculateOrderAmount,
  generateReceiptId,
  validatePaymentData,
} from '../services/payment.js';

const router = Router();

router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId, courseId, status, limit } = req.query || {};
    const filters = [];

    if (userId) {
      filters.push(eq(payments.userId, userId));
    }
    if (courseId) {
      filters.push(eq(payments.courseId, courseId));
    }
    if (status) {
      filters.push(eq(payments.status, String(status).toLowerCase()));
    }

    let query = db.select().from(payments).orderBy(desc(payments.createdAt));
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
    res.json(rows);
  } catch (error) {
    console.error('Admin payments list error:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

router.get('/my-payments', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userPayments = await db.select().from(payments)
      .where(eq(payments.userId, req.user.id));

    res.json(userPayments);
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const paymentRecordId = randomUUID();

    await db.insert(payments).values({
      id: paymentRecordId,
      ...req.body,
      userId: req.user.id,
    }).execute();

    const [newPayment] = await db.select().from(payments)
      .where(eq(payments.id, paymentRecordId))
      .limit(1);

    res.status(201).json(newPayment);
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

router.put('/:paymentId', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const [existingPayment] = await db.select().from(payments)
      .where(eq(payments.paymentId, req.params.paymentId))
      .limit(1);

    if (!existingPayment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (existingPayment.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this payment' });
    }

    await db.update(payments)
      .set(req.body)
      .where(eq(payments.paymentId, req.params.paymentId))
      .execute();

    const [updatedPayment] = await db.select().from(payments)
      .where(eq(payments.paymentId, req.params.paymentId))
      .limit(1);

    res.json(updatedPayment);
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

export default router;
