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

export const getAllUsers = (params) => apiRequest(`/admin/users${buildQuery(params)}`);

export const createUser = (payload) => apiRequest('/admin/users', {
  method: 'POST',
  body: payload,
});

export const getUserById = (userId) => apiRequest(`/admin/users/${userId}`);

export const updateUserById = (userId, payload) => apiRequest(`/admin/users/${userId}`, {
  method: 'PUT',
  body: payload,
});

export default {
  getAllUsers,
  createUser,
  getUserById,
  updateUserById,
};
