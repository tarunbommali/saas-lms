import apiRequest from './client.js';

const buildQuery = (params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    searchParams.append(key, value);
  });
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
};

export const createEnrollment = (payload) => apiRequest('/enrollments', {
  method: 'POST',
  body: payload,
});

export const getMyEnrollments = () => apiRequest('/enrollments/my-enrollments');

export const getUserEnrollments = (userId, params) => apiRequest(`/enrollments/user/${userId}${buildQuery(params)}`);

export const getUserEnrollmentStats = (userId) => apiRequest(`/enrollments/user/${userId}/stats`);

export const getAllEnrollments = (params) => apiRequest(`/enrollments${buildQuery(params)}`);

export const getEnrollmentById = (enrollmentId) => apiRequest(`/enrollments/record/${enrollmentId}`);

export const checkUserEnrollment = (courseId) => apiRequest(`/enrollments/${courseId}`);

export const updateEnrollment = (enrollmentId, payload) => apiRequest(`/enrollments/${enrollmentId}`, {
  method: 'PUT',
  body: payload,
});

export const deleteEnrollment = (enrollmentId) => apiRequest(`/enrollments/${enrollmentId}`, {
  method: 'DELETE',
});

export const updateEnrollmentProgress = (enrollmentId, payload) => updateEnrollment(enrollmentId, payload);

export default {
  createEnrollment,
  getMyEnrollments,
  getUserEnrollments,
  getUserEnrollmentStats,
  getAllEnrollments,
  getEnrollmentById,
  checkUserEnrollment,
  updateEnrollment,
  deleteEnrollment,
  updateEnrollmentProgress,
};
