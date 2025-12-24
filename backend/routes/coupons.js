/* eslint-disable no-console */
import { Router } from 'express';
import { randomUUID } from 'crypto';
import { db } from '../db/index.js';
import { coupons } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

const normalizeCode = (code) => (code || '').trim().toUpperCase();

const ensureArray = (value) => (Array.isArray(value) ? value : []);

const coerceNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === '') return fallback;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const parseDate = (value) => {
  if (!value) return undefined;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const normalizeCouponInput = (input = {}, { userId, isNew = false } = {}) => {
  const now = new Date();

  const normalized = {
    updatedAt: now,
  };

  if (input.code !== undefined || isNew) {
    normalized.code = normalizeCode(input.code);
  }

  if (input.name !== undefined || isNew) {
    normalized.name = input.name?.trim() || null;
  }

  if (input.description !== undefined || isNew) {
    normalized.description = input.description?.trim() || '';
  }

  if (input.type !== undefined || isNew) {
    normalized.type = input.type === 'amount' ? 'amount' : 'percent';
  }

  if (input.value !== undefined || isNew) {
    normalized.value = coerceNumber(input.value, 0);
  }

  if (input.minOrderAmount !== undefined || isNew) {
    normalized.minOrderAmount = coerceNumber(input.minOrderAmount, 0);
  }

  if (input.maxDiscountAmount !== undefined || isNew) {
    normalized.maxDiscountAmount = input.maxDiscountAmount !== undefined && input.maxDiscountAmount !== null && input.maxDiscountAmount !== ''
      ? coerceNumber(input.maxDiscountAmount, 0)
      : null;
  }

  if (input.usageLimit !== undefined || isNew) {
    normalized.usageLimit = input.usageLimit !== undefined && input.usageLimit !== ''
      ? coerceNumber(input.usageLimit, null)
      : null;
  }

  if (input.usageLimitPerUser !== undefined || isNew) {
    normalized.usageLimitPerUser = input.usageLimitPerUser !== undefined && input.usageLimitPerUser !== ''
      ? coerceNumber(input.usageLimitPerUser, 1)
      : 1;
  }

  if (input.isActive !== undefined || isNew) {
    normalized.isActive = input.isActive === undefined ? true : Boolean(input.isActive);
  }

  if (input.applicableCourses !== undefined || isNew) {
    normalized.applicableCourses = ensureArray(input.applicableCourses);
  }

  if (input.applicableCategories !== undefined || isNew) {
    normalized.applicableCategories = ensureArray(input.applicableCategories);
  }

  const validFrom = parseDate(input.validFrom);
  const validUntil = parseDate(input.validUntil);

  if (validFrom) {
    normalized.validFrom = validFrom;
  } else if (isNew) {
    normalized.validFrom = now;
  }

  if (validUntil) {
    normalized.validUntil = validUntil;
  } else if (input.validUntil === null) {
    normalized.validUntil = null;
  }

  if (isNew) {
    normalized.createdAt = now;
    normalized.createdBy = userId || null;
    normalized.usedCount = 0;
    normalized.totalOrders = 0;
    normalized.totalDiscountGiven = 0;
  } else {
    if (input.createdAt !== undefined) {
      const createdAt = parseDate(input.createdAt);
      normalized.createdAt = createdAt || now;
    }
    if (input.createdBy !== undefined) {
      normalized.createdBy = input.createdBy || userId || null;
    }
  }

  return Object.fromEntries(
    Object.entries(normalized).filter(([, value]) => value !== undefined)
  );
};

const evaluateCoupon = (coupon, context = {}) => {
  const { amount = 0, courseId } = context;
  if (!coupon) {
    return { valid: false, message: 'Invalid coupon code' };
  }

  if (!coupon.isActive) {
    return { valid: false, message: 'Coupon is not active' };
  }

  const now = new Date();
  if (coupon.validFrom && new Date(coupon.validFrom) > now) {
    return { valid: false, message: 'Coupon not yet valid' };
  }

  if (coupon.validUntil && new Date(coupon.validUntil) < now) {
    return { valid: false, message: 'Coupon has expired' };
  }

  if (coupon.usageLimit && (coupon.usedCount ?? 0) >= coupon.usageLimit) {
    return { valid: false, message: 'Coupon usage limit reached' };
  }

  if (amount && coupon.minOrderAmount && amount < coupon.minOrderAmount) {
    return {
      valid: false,
      message: `Minimum order amount of ₹${coupon.minOrderAmount / 100} required`,
    };
  }

  if (courseId && Array.isArray(coupon.applicableCourses) && coupon.applicableCourses.length > 0) {
    const isApplicable = coupon.applicableCourses.includes(courseId);
    if (!isApplicable) {
      return { valid: false, message: 'Coupon not applicable for this course' };
    }
  }

  let discount = 0;
  if (coupon.type === 'percent') {
    discount = Math.floor((amount * coupon.value) / 100);
    if (coupon.maxDiscountAmount) {
      discount = Math.min(discount, coupon.maxDiscountAmount);
    }
  } else {
    discount = coupon.value;
  }

  return { valid: true, discount };
};

const fetchCouponByCode = async (code) => {
  if (!code) return null;
  const [coupon] = await db.select().from(coupons)
    .where(eq(coupons.code, normalizeCode(code)))
    .limit(1);
  return coupon || null;
};

router.get('/active', async (req, res) => {
  try {
    const allCoupons = await db.select().from(coupons);
    const now = new Date();
    const active = allCoupons.filter((coupon) => {
      if (!coupon.isActive) return false;
      if (coupon.validFrom && new Date(coupon.validFrom) > now) return false;
      if (coupon.validUntil && new Date(coupon.validUntil) < now) return false;
      if (coupon.usageLimit && (coupon.usedCount ?? 0) >= coupon.usageLimit) return false;
      return true;
    });
    res.json(active);
  } catch (error) {
    console.error('Get active coupons error:', error);
    res.status(500).json({ error: 'Failed to fetch active coupons' });
  }
});

router.post('/validate', authenticateToken, async (req, res) => {
  try {
    const { code, courseId, amount } = req.body || {};

    if (!code) {
      return res.status(400).json({ error: 'Coupon code is required' });
    }

    const coupon = await fetchCouponByCode(code);
    const evaluation = evaluateCoupon(coupon, { amount, courseId });

    if (!evaluation.valid) {
      return res.status(400).json({ error: evaluation.message || 'Invalid coupon' });
    }

    res.json({ valid: true, coupon, discount: evaluation.discount });
  } catch (error) {
    console.error('Validate coupon error:', error);
    res.status(500).json({ error: 'Failed to validate coupon' });
  }
});

router.post('/apply', authenticateToken, async (req, res) => {
  try {
    const { code, courseId, amount } = req.body || {};

    if (!code) {
      return res.status(400).json({ error: 'Coupon code is required' });
    }

    const coupon = await fetchCouponByCode(code);
    const evaluation = evaluateCoupon(coupon, { amount, courseId });

    if (!evaluation.valid) {
      return res.status(400).json({ error: evaluation.message || 'Invalid coupon' });
    }

    const updatedFields = {
      usedCount: (coupon.usedCount ?? 0) + 1,
      totalOrders: (coupon.totalOrders ?? 0) + 1,
      totalDiscountGiven: (coupon.totalDiscountGiven ?? 0) + evaluation.discount,
      updatedAt: new Date(),
    };

    await db.update(coupons)
      .set(updatedFields)
      .where(eq(coupons.id, coupon.id))
      .execute();

    res.json({
      applied: true,
      coupon: { ...coupon, ...updatedFields },
      discount: evaluation.discount,
    });
  } catch (error) {
    console.error('Apply coupon error:', error);
    res.status(500).json({ error: 'Failed to apply coupon' });
  }
});

router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const allCoupons = await db.select().from(coupons);
    res.json(allCoupons);
  } catch (error) {
    console.error('Get coupons error:', error);
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const couponId = req.body?.id || randomUUID();
    const normalizedInput = normalizeCouponInput(req.body, {
      userId: req.user?.id,
      isNew: true,
    });

    if (!normalizedInput.code) {
      return res.status(400).json({ error: 'Coupon code is required' });
    }

    if (!normalizedInput.name) {
      return res.status(400).json({ error: 'Coupon name is required' });
    }

    await db.insert(coupons).values({
      id: couponId,
      ...normalizedInput,
    }).execute();

    const [newCoupon] = await db.select().from(coupons).where(eq(coupons.id, couponId)).limit(1);
    res.status(201).json(newCoupon);
  } catch (error) {
    console.error('Create coupon error:', error);
    res.status(500).json({ error: 'Failed to create coupon' });
  }
});

router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [existingCoupon] = await db.select().from(coupons).where(eq(coupons.id, req.params.id)).limit(1);

    if (!existingCoupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    const normalizedInput = normalizeCouponInput(req.body, {
      userId: req.user?.id || existingCoupon.createdBy,
      isNew: false,
    });

    await db.update(coupons)
      .set(normalizedInput)
      .where(eq(coupons.id, req.params.id))
      .execute();

    const [updatedCoupon] = await db.select().from(coupons).where(eq(coupons.id, req.params.id)).limit(1);

    res.json(updatedCoupon);
  } catch (error) {
    console.error('Update coupon error:', error);
    res.status(500).json({ error: 'Failed to update coupon' });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await db.delete(coupons).where(eq(coupons.id, req.params.id));
    res.json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    console.error('Delete coupon error:', error);
    res.status(500).json({ error: 'Failed to delete coupon' });
  }
});

export default router;
