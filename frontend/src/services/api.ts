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
  '/auth/forgot-password/request',
  '/auth/forgot-password/verify',
  '/auth/forgot-password/reset',
];

const normalizeUrl = (url?: string): string => {
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
  } else if (normalized === '/api') {
    normalized = '/';
  } else if (normalized.startsWith('api/')) {
    normalized = normalized.substring('api'.length);
  }

  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }

  return normalized;
};

const stripDuplicateApiPrefix = (url?: string): string | undefined => {
  if (!url || url.startsWith('http')) return url;

  if (url === '/api') return '/';
  if (url.startsWith('/api/')) return url.substring('/api'.length);
  if (url.startsWith('api/')) return url.substring('api'.length);

  return url;
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

const isTokenFreeEndpoint = (url?: string): boolean => {
  const normalized = normalizeUrl(url);
  return TOKEN_FREE_ENDPOINTS.some((endpoint) => normalized.startsWith(endpoint));
};

const redirectToLogin = () => {
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

api.interceptors.request.use((config) => {
  const originalUrl = config.url;
  const normalizedUrl = normalizeUrl(originalUrl);

  config.url = stripDuplicateApiPrefix(originalUrl);
  config.headers = AxiosHeaders.from(config.headers);

  if (isTokenFreeEndpoint(normalizedUrl)) {
    config.headers.delete('Authorization');
    config.headers.delete('authorization');
    return config;
  }

  const token = authStorage.getAccessToken()?.trim();

  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
    return config;
  }

  authStorage.clearSession();
  redirectToLogin();
  throw new Error('Missing authentication token. Please log in again.');
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error?.response?.data != null) {
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

      if (status === 401 || (status === 403 && !hasAuthorizationHeader)) {
        authStorage.clearSession();
        redirectToLogin();
      }

      return Promise.reject(error);
    },
);

export default api;
