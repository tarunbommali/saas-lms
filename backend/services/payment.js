/* eslint-disable no-console */
import crypto from 'crypto';

/**
 * Payment Service for Razorpay Integration
 * Handles payment creation, verification, and security
 */

/**
 * Check if we're in mock payment mode
 */
export const isMockPaymentMode = () => {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  return keyId.includes('mock') || keyId.includes('test') || !keyId;
};

/**
 * Generate Razorpay Order
 */
export const createRazorpayOrder = async ({
  amount,
  currency = 'INR',
  receipt,
  notes = {},
}) => {
  try {
    // Validate Razorpay credentials
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Check if using mock mode
    const mockMode = isMockPaymentMode();

    if (mockMode) {
      console.log('📦 Using MOCK payment mode - Order created without Razorpay API');
      // Return mock order for development/testing
      const mockOrderId = `order_mock_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
      return {
        success: true,
        orderId: mockOrderId,
        amount,
        currency,
        receipt,
        mock: true,
        message: 'Mock payment order created successfully',
      };
    }

    // In production with real keys, integrate with actual Razorpay SDK
    // const Razorpay = require('razorpay');
    // const instance = new Razorpay({ key_id: keyId, key_secret: keySecret });
    // const order = await instance.orders.create({ amount: amount * 100, currency, receipt, notes });

    // For now, return structured response
    return {
      success: true,
      orderId: `order_${crypto.randomBytes(16).toString('hex')}`,
      amount,
      currency,
      receipt,
      notes,
    };
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    return {
      success: false,
      error: error.message || 'Failed to create payment order',
    };
  }
};

/**
 * Verify Razorpay Payment Signature
 */
export const verifyRazorpaySignature = ({
  orderId,
  paymentId,
  signature,
}) => {
  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      console.warn('Razorpay secret not configured. Skipping signature verification.');
      return { success: true, verified: false, mock: true };
    }

    // Generate expected signature
    const text = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(text)
      .digest('hex');

    // Compare signatures
    const isValid = expectedSignature === signature;

    return {
      success: true,
      verified: isValid,
      message: isValid ? 'Payment verified successfully' : 'Invalid signature',
    };
  } catch (error) {
    console.error('Error verifying signature:', error);
    return {
      success: false,
      verified: false,
      error: error.message || 'Signature verification failed',
    };
  }
};

/**
 * Calculate order amount with discount
 */
export const calculateOrderAmount = ({
  price,
  discount = 0,
  discountType = 'percentage', // 'percentage' or 'fixed'
  taxRate = 0,
}) => {
  let finalAmount = price;

  // Apply discount
  if (discount > 0) {
    if (discountType === 'percentage') {
      finalAmount = price - (price * discount) / 100;
    } else {
      finalAmount = price - discount;
    }
  }

  // Apply tax
  if (taxRate > 0) {
    finalAmount = finalAmount + (finalAmount * taxRate) / 100;
  }

  // Ensure minimum amount (Razorpay requires minimum 1 INR)
  finalAmount = Math.max(1, Math.round(finalAmount));

  return {
    originalAmount: price,
    discount: price - (finalAmount / (1 + taxRate / 100)),
    tax: finalAmount - (finalAmount / (1 + taxRate / 100)),
    finalAmount,
  };
};

/**
 * Generate payment receipt ID
 */
export const generateReceiptId = (prefix = 'rcpt') => {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  return `${prefix}_${timestamp}_${random}`;
};

/**
 * Validate payment data
 */
export const validatePaymentData = (data) => {
  const errors = [];

  if (!data.amount || data.amount <= 0) {
    errors.push('Invalid amount');
  }

  if (!data.courseId) {
    errors.push('Course ID is required');
  }

  if (!data.userId) {
    errors.push('User ID is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Format payment response
 */
export const formatPaymentResponse = (payment) => {
  return {
    id: payment.id,
    orderId: payment.orderId,
    paymentId: payment.paymentId,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    method: payment.method,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
};

/**
 * Handle payment webhook
 */
export const handlePaymentWebhook = async (payload, signature) => {
  try {
    const keySecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!keySecret) {
      console.warn('Webhook secret not configured');
      return { success: false, error: 'Webhook not configured' };
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (expectedSignature !== signature) {
      return { success: false, error: 'Invalid webhook signature' };
    }

    // Process webhook event
    const { event, payload: eventPayload } = payload;

    switch (event) {
      case 'payment.captured':
        // Handle successful payment
        console.log('Payment captured:', eventPayload.payment.entity.id);
        break;
      case 'payment.failed':
        // Handle failed payment
        console.log('Payment failed:', eventPayload.payment.entity.id);
        break;
      case 'order.paid':
        // Handle order paid
        console.log('Order paid:', eventPayload.order.entity.id);
        break;
      default:
        console.log('Unhandled webhook event:', event);
    }

    return { success: true, event };
  } catch (error) {
    console.error('Error handling webhook:', error);
    return { success: false, error: error.message };
  }
};

export default {
  createRazorpayOrder,
  verifyRazorpaySignature,
  calculateOrderAmount,
  generateReceiptId,
  validatePaymentData,
  formatPaymentResponse,
  handlePaymentWebhook,
};
