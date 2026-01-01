/* eslint-disable no-console */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID, randomBytes, createHash } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { generateToken, authenticateToken } from '../middleware/auth.js';
import { sendOtpEmail, sendWelcomeEmail } from '../services/email.js';
import {
  generateOTPWithExpiry,
  hashOTP,
  verifyOTP,
  checkOTPRateLimit,
} from '../services/otp.js';
import { validateBody } from '../middleware/validation.middleware.js';
import {
  SignupDTO,
  LoginDTO,
  ForgotPasswordDTO,
  VerifyOtpDTO,
  ResetPasswordDTO,
  UpdateProfileDTO,
  GoogleAuthDTO,
} from '../dto/index.js';

const router = Router();
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

const sanitizeUser = (user) => {
  if (!user) return null;
  const safeUser = { ...user };
  delete safeUser.password;
  delete safeUser.passwordResetToken;
  delete safeUser.passwordResetExpires;
  return safeUser;
};

const normalizeEmail = (email) => (email ? email.trim().toLowerCase() : email);

router.post('/signup', validateBody(SignupDTO), async (req, res) => {
  try {
    const { email, password, firstName, lastName, displayName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const normalizedEmail = normalizeEmail(email);

    const existingUser = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userId = randomUUID();
    const resolvedDisplayName = displayName || [firstName, lastName].filter(Boolean).join(' ').trim() || normalizedEmail;

    await db.insert(users).values({
      id: userId,
      email: normalizedEmail,
      password: hashedPassword,
      firstName,
      lastName,
      displayName: resolvedDisplayName,
      emailVerified: false,
      authProvider: 'password',
    }).execute();

    const [newUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    // Send welcome email (non-blocking)
    sendWelcomeEmail(normalizedEmail, resolvedDisplayName).catch(err => {
      console.error('Welcome email failed:', err);
    });

    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      isAdmin: newUser.isAdmin || false,
    });

    res.status(201).json({ 
      user: sanitizeUser(newUser), 
      token,
      message: 'Account created successfully'
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.post('/login', validateBody(LoginDTO), async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = normalizeEmail(email);

    const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);

    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await db.update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id))
      .execute();

    const token = generateToken({
      id: user.id,
      email: user.email,
      isAdmin: user.isAdmin || false,
    });

    res.json({ user: sanitizeUser(user), token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/forgot-password', validateBody(ForgotPasswordDTO), async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = normalizeEmail(email);

    // Check rate limit
    const rateLimit = checkOTPRateLimit(normalizedEmail, 3, 15);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        error: rateLimit.error,
        resetTime: rateLimit.resetTime,
      });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    // Always return success message to prevent email enumeration
    const genericResponse = {
      message: 'If an account exists with this email, an OTP has been sent.',
      success: true,
      remaining: rateLimit.remaining,
    };

    if (!user || user.isActive === false) {
      return res.json(genericResponse);
    }

    // Generate secure OTP with expiry
    const { otp, expiresAt, expiryMinutes } = generateOTPWithExpiry(10);

    // Hash the OTP for secure storage
    const hashedOtp = hashOTP(otp);

    await db
      .update(users)
      .set({
        passwordResetToken: hashedOtp,
        passwordResetExpires: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .execute();

    // Send OTP via email
    const emailResult = await sendOtpEmail(user.email, otp, expiryMinutes);

    if (emailResult.success) {
      console.log(`[OTP] Email sent successfully to ${user.email}`);
    } else if (emailResult.skipped) {
      console.warn(`[OTP] Email service not configured. OTP for ${email}: ${otp}`);
      // In development, show OTP in response when email is not configured
      if (process.env.NODE_ENV !== 'production') {
        genericResponse.otp = otp;
        genericResponse.expiresAt = expiresAt.toISOString();
        genericResponse.emailSkipped = true;
      }
    } else {
      console.error(`[OTP] Failed to send email: ${emailResult.message}`);
    }

    // Always show OTP in development mode for testing
    if (process.env.NODE_ENV === 'development') {
      genericResponse.otp = otp;
      genericResponse.expiresAt = expiresAt.toISOString();
      console.log(`\n🔐 Development OTP for ${email}: ${otp}\n`);
    }

    res.json(genericResponse);
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to initiate password reset' });
  }
});

// Verify OTP endpoint
router.post('/verify-otp', validateBody(VerifyOtpDTO), async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const normalizedEmail = normalizeEmail(email);
    const hashedOtp = hashOTP(otp.toString());

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!user) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Use the OTP verification service
    const verification = verifyOTP(otp.toString(), user.passwordResetToken, user.passwordResetExpires);

    if (!verification.valid) {
      return res.status(400).json({ error: verification.error });
    }

    // Generate a temporary reset token for the reset-password step
    const resetToken = randomBytes(32).toString('hex');
    const hashedResetToken = createHash('sha256').update(resetToken).digest('hex');

    // Extend expiry for 10 more minutes for password reset step
    const newExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await db
      .update(users)
      .set({
        passwordResetToken: hashedResetToken,
        passwordResetExpires: newExpiry,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .execute();

    res.json({
      success: true,
      message: 'OTP verified successfully. You can now reset your password.',
      resetToken, // Client uses this for the final reset step
      expiresAt: newExpiry.toISOString(),
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});


router.post('/reset-password', validateBody(ResetPasswordDTO), async (req, res) => {
  try {
    const { token, newPassword, password } = req.body;

    const resolvedPassword = newPassword || password;

    if (!token || !resolvedPassword) {
      return res.status(400).json({ error: 'Reset token and new password are required' });
    }

    if (resolvedPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const hashedToken = createHash('sha256').update(token).digest('hex');

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.passwordResetToken, hashedToken))
      .limit(1);

    const expiresAt = user?.passwordResetExpires instanceof Date
      ? user.passwordResetExpires
      : user?.passwordResetExpires
        ? new Date(user.passwordResetExpires)
        : null;

    if (!user || !expiresAt || expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const hashedPassword = await bcrypt.hash(resolvedPassword, 10);

    await db
      .update(users)
      .set({
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        authProvider: 'password',
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .execute();

    const [updatedUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    const authToken = generateToken({
      id: updatedUser.id,
      email: updatedUser.email,
      isAdmin: updatedUser.isAdmin || false,
    });

    res.json({
      message: 'Password reset successful',
      user: sanitizeUser(updatedUser),
      token: authToken,
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const [user] = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(sanitizeUser(user));
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

router.put('/profile', authenticateToken, validateBody(UpdateProfileDTO), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const updateData = { ...req.body };
    delete updateData.password;
    delete updateData.email;
    delete updateData.isAdmin;

    await db.update(users)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(users.id, req.user.id))
      .execute();

    const [updatedUser] = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);

    res.json(sanitizeUser(updatedUser));
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.post('/google', async (req, res) => {
  if (!googleClient) {
    return res.status(500).json({ error: 'Google sign-in is not configured' });
  }

  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'Missing Google credential' });
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (verificationError) {
      console.error('Google token verification failed:', verificationError);
      return res.status(401).json({ error: 'Invalid Google credential' });
    }

    const email = normalizeEmail(payload?.email);
    const googleId = payload?.sub;

    if (!email) {
      return res.status(400).json({ error: 'Google account does not include an email address' });
    }

    let [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user) {
      const userId = randomUUID();
      const newUserData = {
        id: userId,
        email,
        googleId,
        authProvider: 'google',
        displayName: payload?.name || email,
        firstName: payload?.given_name,
        lastName: payload?.family_name,
        photoURL: payload?.picture,
        emailVerified: Boolean(payload?.email_verified),
        isActive: true,
      };

      await db.insert(users).values(newUserData).execute();
      [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    } else {
      const updates = {
        googleId: googleId || user.googleId,
        authProvider: 'google',
        displayName: payload?.name || user.displayName || email,
        firstName: payload?.given_name || user.firstName,
        lastName: payload?.family_name || user.lastName,
        photoURL: payload?.picture || user.photoURL,
        emailVerified: payload?.email_verified !== undefined ? Boolean(payload.email_verified) : user.emailVerified,
        updatedAt: new Date(),
      };

      await db.update(users)
        .set(updates)
        .where(eq(users.id, user.id))
        .execute();

      [user] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    }

    await db.update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id))
      .execute();

    const token = generateToken({
      id: user.id,
      email: user.email,
      isAdmin: user.isAdmin || false,
    });

    res.json({ user: sanitizeUser(user), token });
  } catch (error) {
    console.error('Google sign-in error:', error);
    res.status(500).json({ error: 'Failed to sign in with Google' });
  }
});

export default router;
