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
  
  // Pending Queue
  pendingQueue: () => client.get(`${BASE}/pending-queue/`),
  runCheck: (id) => client.post(`${BASE}/run-check/${id}/`),
  bulkRun: (proposal_ids) => client.post(`${BASE}/bulk-run-check/`, { proposal_ids }),
  
  // Review Results
  reviewResults: () => client.get(`${BASE}/review-results/`),
  updateReviewStatus: (id, review_status) => client.patch(`${BASE}/review-status/${id}/`, { review_status }),
};