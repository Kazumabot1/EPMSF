import axios, { AxiosHeaders } from 'axios';
import { authStorage } from './authStorage';
import { isBackendUnreachableStatus } from './apiError';

const api = axios.create({
  baseURL: '/api',
});

const TOKEN_FREE_ENDPOINTS = [
  '/auth/login',
  '/auth/refresh',
  '/auth/logout',
  '/auth/forgot-password',
  '/auth/forgot-password/request',
  '/auth/forgot-password/verify',
  '/auth/forgot-password/reset',
  '/auth/reset-password',
  '/auth/change-password',
];

const normalizeUrl = (url?: string) => {
  if (!url) return '';

  let normalized = url;

  if (normalized.startsWith('http')) {
    try {
      normalized = new URL(normalized).pathname;
    } catch {
      normalized = url;
    }
  }

  if (normalized.startsWith('/api/')) {
    normalized = normalized.substring('/api'.length);
  }

  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }

  return normalized;
};

const normalizeErrorResponseData = async (data: unknown): Promise<unknown> => {
  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    const text = await data.text();
    if (!text) return data;

    try {
      return JSON.parse(text);
    } catch {
      return { message: text };
    }
  }

  return data;
};

const isTokenFreeEndpoint = (url?: string) => {
  const normalized = normalizeUrl(url);
  return TOKEN_FREE_ENDPOINTS.some((endpoint) => normalized.startsWith(endpoint));
};

api.interceptors.request.use((config) => {
  const normalizedUrl = normalizeUrl(config.url);

  if (typeof config.url === 'string' && config.url.startsWith('/api/')) {
    config.url = config.url.substring('/api'.length);
  }

  config.headers = AxiosHeaders.from(config.headers);

  if (isTokenFreeEndpoint(normalizedUrl)) {
    config.headers.delete('Authorization');
    config.headers.delete('authorization');
    return config;
  }

  const token = authStorage.getAccessToken();

  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
    return config;
  }

  authStorage.clearSession();
  window.location.href = '/login';
  throw new Error('Missing authentication token. Please log in again.');
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response) {
      error.response.data = await normalizeErrorResponseData(error.response.data);
    }

    const status = error?.response?.status;
    const url = error?.config?.url ?? '';
    const hasToken = Boolean(authStorage.getAccessToken());
    const headers = AxiosHeaders.from(error?.config?.headers);
    const hasAuthorizationHeader = Boolean(headers.get('Authorization'));

    if (status !== 409 && !isBackendUnreachableStatus(status)) {
      console.error('API Error:', {
        status: error.response?.status,
        message: error.response?.data?.message,
        path: error.response?.data?.path ?? url,
        validationErrors: error.response?.data?.validationErrors,
        hasToken,
        hasAuthorizationHeader,
      });
    }

    if (status === 401) {
      authStorage.clearSession();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    if (status === 403 && !hasToken) {
      authStorage.clearSession();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    return Promise.reject(error);
  },
);

export default api;
