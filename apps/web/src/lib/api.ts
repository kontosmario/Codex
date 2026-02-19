import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

import { useAuthStore } from '../store/auth';

interface RequestMeta {
  offlineReplay?: boolean;
  idempotencyKey?: string;
}

interface ApiRequestConfig extends InternalAxiosRequestConfig {
  meta?: RequestMeta;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 15000
});

api.interceptors.request.use((config) => {
  const nextConfig = config as ApiRequestConfig;
  const token = useAuthStore.getState().token;

  if (token) {
    nextConfig.headers.Authorization = `Bearer ${token}`;
  }

  if (nextConfig.meta?.offlineReplay && nextConfig.meta.idempotencyKey) {
    nextConfig.headers['X-Idempotency-Key'] = nextConfig.meta.idempotencyKey;
  }

  return nextConfig;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const requestPath = String(error.config?.url ?? '');

    if (error.response?.status === 401 && !requestPath.includes('/auth/login')) {
      useAuthStore.getState().logout();
    }

    return Promise.reject(error);
  }
);

export default api;
