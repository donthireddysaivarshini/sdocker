import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL ;

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 200000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// This ensures that if a token exists, search/upload requests are authenticated
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Search & Autocomplete
export const searchService = {
  autocomplete: async (query) => {
    const response = await api.get('/homes/autocomplete/', {
      params: { q: query, limit: 10 },
    });
    return response.data;
  },

  search: async (params) => {
    const response = await api.get('/homes/search/', { params });
    return response.data;
  },

  nearby: async (params) => {
    const response = await api.get('/homes/nearby/', { params });
    return response.data;
  },

  getAll: async () => {
    const response = await api.get('/homes/');
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/homes/${id}/`);
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/homes/stats/');
    return response.data;
  },
};

// Upload service
export const uploadService = {
  uploadFile: async (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/uploads/', formData, {
      headers: {
        ...api.defaults.headers, // ✅ Preserve Authorization header
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });

    return response.data;
  },

  getProgress: async (jobId) => {
    const response = await api.get(`/uploads/${jobId}/progress/`);
    return response.data;
  },
};

export default api;
