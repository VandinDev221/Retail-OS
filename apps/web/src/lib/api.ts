import axios from 'axios';

let rawBaseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
if (rawBaseURL.endsWith('/')) {
  rawBaseURL = rawBaseURL.slice(0, -1);
}
if (!rawBaseURL.endsWith('/api/v1')) {
  rawBaseURL = `${rawBaseURL}/api/v1`;
}
const baseURL = rawBaseURL;

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('retail_os_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry && typeof window !== 'undefined') {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('retail_os_refresh_token');

      if (refreshToken) {
        try {
          const res = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
          const newToken = res.data.accessToken;
          localStorage.setItem('retail_os_token', newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } catch (refreshErr) {
          localStorage.removeItem('retail_os_token');
          localStorage.removeItem('retail_os_refresh_token');
          localStorage.removeItem('retail_os_user');
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }
      }
    }
    return Promise.reject(error);
  },
);
