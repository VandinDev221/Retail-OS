import axios from 'axios';

let rawBaseURL = process.env.NEXT_PUBLIC_API_URL || 'https://retail-os-z4r4.onrender.com/api/v1';
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
    try {
      const token = localStorage.getItem('retail_os_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // ignore
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      (error.response?.status === 401 || error.response?.status === 403) &&
      !originalRequest._retry &&
      typeof window !== 'undefined'
    ) {
      originalRequest._retry = true;
      let refreshToken = null;
      try {
        refreshToken = localStorage.getItem('retail_os_refresh_token');
      } catch (e) {
        refreshToken = null;
      }

      if (refreshToken) {
        try {
          const res = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
          const newToken = res.data.accessToken;
          try {
            localStorage.setItem('retail_os_token', newToken);
          } catch (e) {}
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } catch (refreshErr) {
          try {
            localStorage.clear();
          } catch (e) {}
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }
      } else {
        try {
          localStorage.clear();
        } catch (e) {}
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  },
);
