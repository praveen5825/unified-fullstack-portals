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

  // Was: downloadReportUrl(...) returning a plain string used in <a href>/window.open.
  // That bypasses axios entirely, so the JWT Authorization header never gets attached
  // -> backend correctly returns 401. This does the actual authenticated fetch instead.
  downloadReport: async (checkId, matchedId) => {
    const res = await client.get(`${BASE}/compare/${matchedId}/report/`, {
      params: { check_id: checkId },
      responseType: 'blob',
    });
    const blob = new Blob([res.data], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plagiarism_report_${checkId.slice(0, 8)}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  // Pending Queue
  pendingQueue: () => client.get(`${BASE}/pending/`),
  runCheck: (id) => client.post(`${BASE}/${id}/run/`),
  bulkRun: (proposal_ids) => client.post(`${BASE}/bulk-run/`, { proposal_ids }),

  // Review Results
  reviewResults: () => client.get(`${BASE}/review/`),
  updateReviewStatus: (id, review_status) =>
    client.patch(`${BASE}/review/${id}/status/`, { review_status }),
};

// ── Analytics API ─────────────────────────────────────────────────────────────
export const analyticsApi = {
  overview:       (params) => client.get(`${BASE}/analytics/overview/`, { params }),
  yearly:         (params) => client.get(`${BASE}/analytics/yearly/`, { params }),
  statewise:      (params) => client.get(`${BASE}/analytics/statewise/`, { params }),
  researchArea:   (params) => client.get(`${BASE}/analytics/research-area/`, { params }),
  session:        (params) => client.get(`${BASE}/analytics/session/`, { params }),
  duplicateStats: (params) => client.get(`${BASE}/analytics/duplicate-stats/`, { params }),
};

// ── Search API ────────────────────────────────────────────────────────────────
export const searchApi = {
  /**
   * Simple full-text search across all proposals.
   * GET /api/duplicate-check/search/?q=…&scheme=…&status=…&year=…&page=1
   */
  globalSearch: (params) => client.get(`${BASE}/search/`, { params }),

  /**
   * Boolean search — POST with { query, search_in, scheme, status, year, page }
   * query supports: AND  OR  NOT  "phrase"
   * search_in: "title" | "synopsis" | "both"
   */
  booleanSearch: (body) => client.post(`${BASE}/boolean-search/`, body),
};