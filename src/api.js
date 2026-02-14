import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import useStore from './hooks/useStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL + '/' + import.meta.env.VITE_API_VERSION + '/',
});

api.interceptors.request.use(
  (config) => {
    const store = useStore.getState();
    if (store.token) {
      config.headers.Authorization = `Bearer ${store.token}`;
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
      originalRequest._retry = true;

      const store = useStore.getState();
      store.logout();

      // const navigate = useNavigate();
      // navigate('/login');
    }

    return Promise.reject(error);
  }
);

export default api;
