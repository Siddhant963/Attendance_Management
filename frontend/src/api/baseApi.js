import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { logout } from '../features/auth/authSlice.js';

// Tolerates a trailing slash and a missing /api suffix in VITE_API_URL; the backend always serves under /api.
const configuredUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');
export const API_URL = configuredUrl.endsWith('/api') ? configuredUrl : `${configuredUrl}/api`;

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  prepareHeaders: (headers, { getState }) => {
    const { token } = getState().auth;
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
});

// An expired/invalid token on an authenticated call signs the user out.
const baseQuery = async (args, api, extra) => {
  const result = await rawBaseQuery(args, api, extra);
  const url = typeof args === 'string' ? args : args.url;
  if (result.error?.status === 401 && !url.startsWith('/auth/login') && api.getState().auth.token) {
    api.dispatch(logout());
  }
  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['Current', 'Attendance', 'Overtime', 'Users', 'Summary', 'Report'],
  endpoints: () => ({}),
});

export const errorMessage = (err, fallback = 'Something went wrong') =>
  err?.data?.message || (err?.status === 'FETCH_ERROR' ? 'Cannot reach the server' : fallback);
