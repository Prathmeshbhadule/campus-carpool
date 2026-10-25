import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

// Request interceptor: attach token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('mitaoe_carpool_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: extract response payload or error message
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorData = error.response?.data;
    const message = errorData?.message || error.message || 'An unexpected error occurred';
    const errors = errorData?.errors || null;

    // Handle session expiry
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('mitaoe_carpool_token');
      localStorage.removeItem('mitaoe_carpool_user');
      // Only redirect if not already on login
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login?expired=true';
      }
    }

    return Promise.reject({
      status: error.response?.status,
      message,
      errors,
      raw: error
    });
  }
);

export default apiClient;
