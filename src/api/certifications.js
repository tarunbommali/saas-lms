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

export const getAdminCertifications = (params) =>
  apiRequest(`/admin/certifications${buildQuery(params)}`);

export const getCertificationById = (certificationId) =>
  apiRequest(`/admin/certifications/${certificationId}`);

export const createCertification = (payload) =>
  apiRequest('/admin/certifications', {
    method: 'POST',
    body: payload,
  });

export const updateCertification = (certificationId, payload) =>
  apiRequest(`/admin/certifications/${certificationId}`, {
    method: 'PUT',
    body: payload,
  });

export const deleteCertification = (certificationId) =>
  apiRequest(`/admin/certifications/${certificationId}`, {
    method: 'DELETE',
  });

export default {
  getAdminCertifications,
  getCertificationById,
  createCertification,
  updateCertification,
  deleteCertification,
};