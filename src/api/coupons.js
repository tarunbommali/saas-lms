import apiRequest from './client.js';

export const getActiveCoupons = () => apiRequest('/coupons/active', { withAuth: false });

export const validateCouponCode = (payload) => apiRequest('/coupons/validate', {
  method: 'POST',
  body: payload,
});

export const applyCoupon = (payload) => apiRequest('/coupons/apply', {
  method: 'POST',
  body: payload,
});

export const getAllCoupons = () => apiRequest('/coupons', { method: 'GET' });

export const createCoupon = (payload) => apiRequest('/coupons', {
  method: 'POST',
  body: payload,
});

export const updateCoupon = (couponId, payload) => apiRequest(`/coupons/${couponId}`, {
  method: 'PUT',
  body: payload,
});

export const deleteCoupon = (couponId) => apiRequest(`/coupons/${couponId}`, {
  method: 'DELETE',
});

export default {
  getActiveCoupons,
  validateCouponCode,
  applyCoupon,
  getAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
};
