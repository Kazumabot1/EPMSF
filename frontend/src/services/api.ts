import axios, { AxiosHeaders } from 'axios';
import { authStorage } from './authStorage';
import { isBackendUnreachableStatus } from './apiError';

const api = axios.create({
  baseURL: '/api',
});

const isAuthEndpoint = (url?: string) => {
  if (!url) return false;

  return (
    url.includes('/auth/login') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/logout') ||
    url.includes('/auth/forgot-password') ||
    url.includes('/auth/reset-password') ||
    url.includes('/auth/change-password')
  );
};

api.interceptors.request.use((config) => {
  const token = authStorage.getAccessToken();

  if (typeof config.url === 'string' && config.url.startsWith('/api/')) {
    config.url = config.url.substring('/api'.length);
  }

  config.headers = AxiosHeaders.from(config.headers);

  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }

  if (!token && !isAuthEndpoint(config.url)) {
    authStorage.clearSession();
    window.location.href = '/login';
    throw new Error('Missing authentication token. Please log in again.');
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url ?? '';
    const hasToken = Boolean(authStorage.getAccessToken());
    const headers = AxiosHeaders.from(error?.config?.headers);
    const hasAuthorizationHeader = Boolean(headers.get('Authorization'));

    // 409 conflicts and gateway errors are handled in UI; avoid noisy console errors.
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
