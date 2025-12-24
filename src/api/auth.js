import apiRequest, { setAuthToken, clearAuthToken } from './client.js';

const attachSession = (result) => {
  if (result?.token) {
    setAuthToken(result.token);
  }
  return result;
};

export const signup = async (payload) => attachSession(
  await apiRequest('/auth/signup', {
    method: 'POST',
    body: payload,
  })
);

export const login = async (payload) => attachSession(
  await apiRequest('/auth/login', {
    method: 'POST',
    body: payload,
  })
);

export const loginWithGoogle = async (credential) => attachSession(
  await apiRequest('/auth/google', {
    method: 'POST',
    body: { credential },
  })
);

export const fetchCurrentUser = () => apiRequest('/auth/me');

export const updateProfile = (payload) => apiRequest('/auth/profile', {
  method: 'PUT',
  body: payload,
});

export const requestPasswordReset = async (email) =>
  apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: { email },
  });

export const resetPassword = async (payload) => attachSession(
  await apiRequest('/auth/reset-password', {
    method: 'POST',
    body: payload,
  })
);

export const logoutSession = () => {
  clearAuthToken();
};

export const normalizeUser = (user) => {
  if (!user) return null;
  return {
    ...user,
    uid: user.id ?? user.uid,
  };
};

export const verifyOtp = async (email, otp) =>
  apiRequest('/auth/verify-otp', {
    method: 'POST',
    body: { email, otp },
  });

export default {
  signup,
  login,
  loginWithGoogle,
  fetchCurrentUser,
  updateProfile,
  requestPasswordReset,
  verifyOtp,
  resetPassword,
  logoutSession,
  normalizeUser,
};
