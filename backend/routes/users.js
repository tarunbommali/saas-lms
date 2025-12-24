/* eslint-disable no-console */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { db } from '../db/index.js';
import { users, enrollments } from '../db/schema.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { eq, desc } from 'drizzle-orm';

const router = Router();

const sanitizeUser = (user) => {
  if (!user) return null;
  const safeUser = { ...user };
  delete safeUser.password;
  return safeUser;
};

const normalizeEmail = (email) => (email ? email.trim().toLowerCase() : email);

router.use(authenticateToken, requireAdmin);

router.get('/', async (req, res) => {
  try {
    const limit = req.query.limit ? Number.parseInt(req.query.limit, 10) : undefined;
    let query = db.select().from(users).orderBy(desc(users.createdAt));
    if (limit && Number.isFinite(limit) && limit > 0) {
      query = query.limit(limit);
    }
    const results = await query;
    const normalized = results.map((user) => sanitizeUser(user));
    res.json(normalized);
  } catch (error) {
    console.error('Admin users list error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      email,
      password,
      displayName,
      firstName,
      lastName,
      phone,
      role = 'student',
      isActive = true,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = normalizeEmail(email);

    const existingUser = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = randomUUID();

    await db.insert(users).values({
      id: userId,
      email: normalizedEmail,
      password: hashedPassword,
      displayName: displayName || [firstName, lastName].filter(Boolean).join(' ').trim() || normalizedEmail,
      firstName,
      lastName,
      phone,
      isAdmin: role === 'admin',
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      authProvider: 'password',
    }).execute();

    const [newUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    res.status(201).json(sanitizeUser(newUser));
  } catch (error) {
    console.error('Admin create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.params.id)).limit(1);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const enrollmentsForUser = await db.select().from(enrollments)
      .where(eq(enrollments.userId, user.id));
    const enriched = {
      ...user,
      totalCoursesEnrolled: enrollmentsForUser.length,
    };

    res.json(sanitizeUser(enriched));
  } catch (error) {
    console.error('Admin get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updates = { ...req.body };

    if (updates.email) {
      updates.email = normalizeEmail(updates.email);
    }

    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    if (updates.role) {
      updates.isAdmin = updates.role === 'admin';
      delete updates.role;
    }

    if (updates.status) {
      updates.isActive = updates.status === 'active';
      delete updates.status;
    }

    if (updates.isActive !== undefined) {
      updates.isActive = Boolean(updates.isActive);
    }

    if (updates.isAdmin !== undefined) {
      updates.isAdmin = Boolean(updates.isAdmin);
    }

    updates.updatedAt = new Date();

    await db.update(users)
      .set(updates)
      .where(eq(users.id, req.params.id))
      .execute();

    const [updatedUser] = await db.select().from(users).where(eq(users.id, req.params.id)).limit(1);

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found after update' });
    }

    res.json(sanitizeUser(updatedUser));
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

export default router;
