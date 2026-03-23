import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL + '/api/v1',
  withCredentials: true,
  timeout: 30000,
});

// Response interceptor — auto-refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      try {
        const { useAuthStore } = await import('../store');
        const { refreshToken, setAuth, logout } = useAuthStore.getState();

        if (!refreshToken) {
          logout();
          return Promise.reject(error);
        }

        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/refresh`,
          { refreshToken }
        );

        const { accessToken, refreshToken: newRefreshToken } = res.data;
        const user = useAuthStore.getState().user!;
        setAuth(user, accessToken, newRefreshToken);

        original.headers['Authorization'] = `Bearer ${accessToken}`;
        return apiClient(original);
      } catch {
        const { logout } = (await import('../store')).useAuthStore.getState();
        logout();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

// Initialize token from store on client
if (typeof window !== 'undefined') {
  const raw = localStorage.getItem('axios-pay-auth');
  if (raw) {
    try {
      const { state } = JSON.parse(raw);
      if (state?.accessToken) {
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${state.accessToken}`;
      }
    } catch {}
  }
}
