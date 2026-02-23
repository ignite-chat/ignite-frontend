import axios from 'axios';
import { useAuthStore } from './store/auth.store';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL + '/' + import.meta.env.VITE_API_VERSION + '/',
});

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Token expired/invalid.
    if (error.response?.status === 401 && !originalRequest._retry) {
      //originalRequest._retry = true;

      //useAuthStore.getState().logout();

      // Redirect to login handled by React Router
    }

    return Promise.reject(error);
  }
);

export default api;
