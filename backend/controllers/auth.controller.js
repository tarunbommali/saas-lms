/**
 * Auth Controller
 * Handles all authentication HTTP requests
 */

import authService from '../services/auth.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export class AuthController {
  /**
   * Register new user
   * POST /api/auth/signup
   */
  signup = asyncHandler(async (req, res) => {
    const { email, password, firstName, lastName } = req.body;
    
    const result = await authService.register({
      email,
      password,
      firstName,
      lastName,
    });
    
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: result,
    });
  });

  /**
   * Login user
   * POST /api/auth/login
   */
  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    
    const result = await authService.login(email, password);
    
    res.json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  });

  /**
   * Google OAuth
   * POST /api/auth/google
   */
  googleAuth = asyncHandler(async (req, res) => {
    const { googleId, email, name, picture } = req.body;
    
    const result = await authService.googleAuth(googleId, {
      email,
      name,
      picture,
    });
    
    res.json({
      success: true,
      message: 'Authentication successful',
      data: result,
    });
  });

  /**
   * Get current user profile
   * GET /api/auth/me
   */
  getProfile = asyncHandler(async (req, res) => {
    const profile = await authService.getProfile(req.user.id);
    
    res.json({
      success: true,
      data: profile,
    });
  });

  /**
   * Update user profile
   * PUT /api/auth/profile
   */
  updateProfile = asyncHandler(async (req, res) => {
    const profile = await authService.updateProfile(req.user.id, req.body);
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: profile,
    });
  });

  /**
   * Request password reset
   * POST /api/auth/forgot-password
   */
  forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    
    const result = await authService.requestPasswordReset(email);
    
    res.json(result);
  });

  /**
   * Verify OTP
   * POST /api/auth/verify-otp
   */
  verifyOTP = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;
    
    const result = await authService.verifyOTP(email, otp);
    
    res.json(result);
  });

  /**
   * Reset password
   * POST /api/auth/reset-password
   */
  resetPassword = asyncHandler(async (req, res) => {
    const { email, resetToken, newPassword } = req.body;
    
    const result = await authService.resetPassword(email, resetToken, newPassword);
    
    res.json(result);
  });

  /**
   * Change password
   * POST /api/auth/change-password
   */
  changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    const result = await authService.changePassword(
      req.user.id,
      currentPassword,
      newPassword
    );
    
    res.json(result);
  });

  /**
   * Logout
   * POST /api/auth/logout
   */
  logout = asyncHandler(async (req, res) => {
    // In a stateless JWT system, logout is handled client-side
    // But we can add token blacklisting here if needed
    
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  });
}

export default new AuthController();
