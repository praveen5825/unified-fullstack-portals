import client from './client';

const BASE = '/duplicate-check';

export const proposalsApi = {
  list: (params) => client.get(`${BASE}/proposals/`, { params }),
  create: (formData) =>
    client.post(`${BASE}/proposals/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  detail: (id) => client.get(`${BASE}/proposals/${id}/`),
  update: (id, formData) =>
    client.patch(`${BASE}/proposals/${id}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete: (id) => client.delete(`${BASE}/proposals/${id}/`),
};

export const duplicateCheckApi = {
  // Ad-hoc check
  checkSynopsis: (formData) =>
    client.post(`${BASE}/check/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getComparison: (checkId, matchedId) =>
    client.get(`${BASE}/compare/${matchedId}/?check_id=${checkId}`),
  downloadReportUrl: (checkId, matchedId) =>
    `${client.defaults.baseURL || 'http://localhost:8000/api'}${BASE}/compare/${matchedId}/report/?check_id=${checkId}`,

  // Pending Queue
  pendingQueue: () => client.get(`${BASE}/pending/`),
  runCheck: (id) => client.post(`${BASE}/${id}/run/`),
  bulkRun: (proposal_ids) => client.post(`${BASE}/bulk-run/`, { proposal_ids }),

  // Review Results
  reviewResults: () => client.get(`${BASE}/review/`),
  // ✅ Fixed: was /review-status/${id}/ — actual URL pattern is /review/${id}/status/
  updateReviewStatus: (id, review_status) =>
    client.patch(`${BASE}/review/${id}/status/`, { review_status }),
};