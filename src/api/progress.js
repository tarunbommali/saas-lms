import apiRequest from './client.js';

export const getUserProgress = (courseId) => apiRequest(`/progress/${courseId}`);

export const updateUserProgress = (courseId, payload) => apiRequest(`/progress/${courseId}`, {
  method: 'PUT',
  body: payload,
});

export const getSecureVideoAccessUrl = (courseId, payload) => apiRequest(`/progress/${courseId}/video`, {
  method: 'POST',
  body: payload,
});

export default {
  getUserProgress,
  updateUserProgress,
  getSecureVideoAccessUrl,
};
