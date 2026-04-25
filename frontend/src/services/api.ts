import axios from 'axios';
import { authStorage } from './authStorage';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = authStorage.getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;