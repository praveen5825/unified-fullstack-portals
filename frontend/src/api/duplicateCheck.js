import client from './client';

const BASE = '/duplicate-check';

export const proposalsApi = {
  list: (params) => client.get(`${BASE}/proposals/`, { params }),
  create: (formData) =>
    client.post(`${BASE}/proposals/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  detail: (id) => client.get(`${BASE}/proposals/${id}/`),
  delete: (id) => client.delete(`${BASE}/proposals/${id}/`),
};

export const duplicateCheckApi = {
  checkSynopsis: (formData) =>
    client.post(`${BASE}/check/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};