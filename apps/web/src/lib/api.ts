'use client';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string) => void;
  reject: (reason?: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null): void {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve(token!);
  });
  failedQueue = [];
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach access token
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('axiospay-auth');
      if (stored) {
        const parsed = JSON.parse(stored);
        const token = parsed?.state?.accessToken;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch {
      // ignore
    }
  }
  return config;
});

// Response interceptor — handle 401 and token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (
      error.response?.status === 401 &&
      error.response?.data?.error === 'TOKEN_EXPIRED' &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
          }
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const stored = localStorage.getItem('axiospay-auth');
        const parsed = stored ? JSON.parse(stored) : null;
        const refreshToken = parsed?.state?.refreshToken;

        if (!refreshToken) throw new Error('No refresh token');

        const response = await axios.post(`${API_URL}/api/v1/auth/refresh`, { refreshToken });
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

        // Update store
        const { useAuthStore } = await import('@/store/authStore');
        const store = useAuthStore.getState();
        store.setAccessToken(newAccessToken);
        if (store.user) {
          store.setAuth(store.user, newAccessToken, newRefreshToken);
        }

        processQueue(null, newAccessToken);

        if (originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        const { useAuthStore } = await import('@/store/authStore');
        useAuthStore.getState().clearAuth();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const api = {
  auth: {
    register: (data: unknown) => apiClient.post('/auth/register', data),
    verifyEmail: (data: unknown) => apiClient.post('/auth/verify-email', data),
    verifyPhone: (data: unknown) => apiClient.post('/auth/verify-phone', data),
    login: (data: unknown) => apiClient.post('/auth/login', data),
    refresh: (data: unknown) => apiClient.post('/auth/refresh', data),
    logout: (data: unknown) => apiClient.post('/auth/logout', data),
    forgotPassword: (data: unknown) => apiClient.post('/auth/forgot-password', data),
    resetPassword: (data: unknown) => apiClient.post('/auth/reset-password', data),
    resendOTP: (data: unknown) => apiClient.post('/auth/resend-otp', data),
  },
  users: {
    getMe: () => apiClient.get('/users/me'),
    updateMe: (data: unknown) => apiClient.patch('/users/me', data),
  },
  wallets: {
    getAll: () => apiClient.get('/wallets'),
    fund: (data: unknown) => apiClient.post('/wallets/fund', data),
    swap: (data: unknown) => apiClient.post('/wallets/swap', data),
    getTransactions: (params?: Record<string, unknown>) => apiClient.get('/wallets/transactions', { params }),
    getTransaction: (id: string) => apiClient.get(`/wallets/transactions/${id}`),
  },
  rates: {
    getAll: () => apiClient.get('/rates'),
    getRate: (from: string, to: string) => apiClient.get(`/rates/${from}/${to}`),
  },
};
