import axios from 'axios';

export const apiClient = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL}/api/v1`,
  withCredentials: true,
  timeout: 30000,
});

apiClient.interceptors.request.use(async (config) => {
  if (typeof window !== 'undefined') {
    const { useAuthStore } = await import('@/store/auth');
    const token = useAuthStore.getState().accessToken;
    if (token) {
      const headers = (config.headers || {}) as Record<string, string>;
      headers.Authorization = `Bearer ${token}`;
      config.headers = headers as any;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original?._retry) {
      original._retry = true;
      const { useAuthStore } = await import('@/store/auth');
      const { refreshToken, user, setAuth, logout } = useAuthStore.getState();

      if (!refreshToken || !user) {
        logout();
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/refresh`, { refreshToken });
        setAuth(user, res.data.accessToken, res.data.refreshToken);
        const headers = (original.headers || {}) as Record<string, string>;
        headers.Authorization = `Bearer ${res.data.accessToken}`;
        original.headers = headers;
        return apiClient(original);
      } catch {
        logout();
      }
    }

    return Promise.reject(error);
  }
);
