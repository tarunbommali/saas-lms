/* eslint-disable no-console */
import crypto from 'crypto';

/**
 * OTP Generation and Verification Service
 * Free, open-source solution using crypto module
 */

/**
 * Generate a random OTP code
 * @param {number} length - Length of OTP (default 6)
 * @returns {string} - Generated OTP
 */
export const generateOTP = (length = 6) => {
  // Generate cryptographically secure random digits
  const digits = '0123456789';
  let otp = '';
  
  const randomBytes = crypto.randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    otp += digits[randomBytes[i] % 10];
  }
  
  return otp;
};

/**
 * Generate OTP with expiry
 * @param {number} expiryMinutes - Expiry time in minutes (default 5)
 * @returns {Object} - OTP data with expiry
 */
export const generateOTPWithExpiry = (expiryMinutes = 5) => {
  const otp = generateOTP(6);
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
  
  return {
    otp,
    expiresAt,
    expiryMinutes,
  };
};

/**
 * Hash OTP for secure storage
 * @param {string} otp - OTP to hash
 * @returns {string} - Hashed OTP
 */
export const hashOTP = (otp) => {
  return crypto
    .createHash('sha256')
    .update(otp)
    .digest('hex');
};

/**
 * Verify OTP
 * @param {string} inputOTP - User input OTP
 * @param {string} storedHash - Stored hashed OTP
 * @param {Date|string} expiresAt - Expiry time
 * @returns {Object} - Verification result
 */
export const verifyOTP = (inputOTP, storedHash, expiresAt) => {
  // Check if OTP is expired
  const now = new Date();
  const expiry = new Date(expiresAt);
  
  if (now > expiry) {
    return {
      valid: false,
      error: 'OTP has expired. Please request a new one.',
    };
  }
  
  // Verify OTP hash
  const inputHash = hashOTP(inputOTP);
  
  if (inputHash !== storedHash) {
    return {
      valid: false,
      error: 'Invalid OTP. Please check and try again.',
    };
  }
  
  return {
    valid: true,
    message: 'OTP verified successfully',
  };
};

/**
 * Generate verification code (alphanumeric)
 * @param {number} length - Length of code (default 8)
 * @returns {string} - Generated code
 */
export const generateVerificationCode = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  
  const randomBytes = crypto.randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    code += chars[randomBytes[i] % chars.length];
  }
  
  return code;
};

/**
 * Rate limiting for OTP requests
 * Prevents abuse by limiting requests per email
 */
const otpRequestTracker = new Map();

/**
 * Check if OTP request is allowed
 * @param {string} email - User email
 * @param {number} maxRequests - Max requests per window (default 3)
 * @param {number} windowMinutes - Time window in minutes (default 15)
 * @returns {Object} - Rate limit result
 */
export const checkOTPRateLimit = (email, maxRequests = 3, windowMinutes = 15) => {
  const key = email.toLowerCase();
  const now = Date.now();
  const windowMs = windowMinutes * 60 * 1000;
  
  if (!otpRequestTracker.has(key)) {
    otpRequestTracker.set(key, {
      requests: 1,
      firstRequest: now,
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
    };
  }
  
  const data = otpRequestTracker.get(key);
  
  // Reset if window has passed
  if (now - data.firstRequest > windowMs) {
    otpRequestTracker.set(key, {
      requests: 1,
      firstRequest: now,
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
    };
  }
  
  // Check if limit reached
  if (data.requests >= maxRequests) {
    const resetTime = new Date(data.firstRequest + windowMs);
    return {
      allowed: false,
      error: 'Too many OTP requests. Please try again later.',
      resetTime,
    };
  }
  
  // Increment requests
  data.requests++;
  otpRequestTracker.set(key, data);
  
  return {
    allowed: true,
    remaining: maxRequests - data.requests,
  };
};

/**
 * Clean up expired rate limit entries
 * Call this periodically to prevent memory leak
 */
export const cleanupOTPRateLimit = () => {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  
  for (const [key, data] of otpRequestTracker.entries()) {
    if (now - data.firstRequest > windowMs) {
      otpRequestTracker.delete(key);
    }
  }
};

// Clean up every 5 minutes
setInterval(cleanupOTPRateLimit, 5 * 60 * 1000);

export default {
  generateOTP,
  generateOTPWithExpiry,
  hashOTP,
  verifyOTP,
  generateVerificationCode,
  checkOTPRateLimit,
  cleanupOTPRateLimit,
};
