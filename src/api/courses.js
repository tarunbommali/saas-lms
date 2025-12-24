import apiRequest from './client.js';

const resolveApiError = (error) => {
  if (!error) {
    return {
      message: 'Request failed',
      status: null,
      payload: null,
    };
  }

  const payload = error?.payload ?? null;
  const candidates = [
    payload?.error,
    payload?.message,
    Array.isArray(payload?.errors) ? payload.errors.join(', ') : null,
    error?.message,
  ];

  const message = candidates.find((value) => typeof value === 'string' && value.trim());

  return {
    message: message?.trim() || 'Request failed',
    status: error?.status ?? null,
    payload,
  };
};

const buildQuery = (params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    searchParams.append(key, value);
  });
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
};

export const getCourses = (params) => apiRequest(`/courses${buildQuery(params)}`);

export const getAdminCourses = () => apiRequest('/courses/admin', { method: 'GET' });

export const getCourseById = (courseId) => apiRequest(`/courses/${courseId}`);

export const createCourse = async (payload) => {
  try {
    const data = await apiRequest('/courses', {
      method: 'POST',
      body: payload,
    });

    return {
      success: true,
      data,
    };
  } catch (error) {
    const { message, status, payload: details } = resolveApiError(error);
    return {
      success: false,
      error: message,
      status,
      payload: details,
    };
  }
};

export const updateCourse = async (courseId, payload) => {
  if (!courseId) {
    return { success: false, error: 'Missing courseId' };
  }

  try {
    const data = await apiRequest(`/courses/${encodeURIComponent(courseId)}`, {
      method: 'PUT',
      body: payload,
    });

    return {
      success: true,
      data,
    };
  } catch (error) {
    const { message, status, payload: details } = resolveApiError(error);
    return {
      success: false,
      error: message,
      status,
      payload: details,
    };
  }
};

export const deleteCourse = (courseId) => apiRequest(`/courses/${courseId}`, {
  method: 'DELETE',
});

export default {
  getCourses,
  getAdminCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
};
