import axios from 'axios';

// Normalize the API base URL so we always hit /api/ in both dev and prod
const API_URL = (() => {
  const raw = import.meta.env.VITE_API_URL ;
  const withSlash = raw.endsWith('/') ? raw : `${raw}/`;
  if (withSlash.includes('/api/')) return withSlash;
  return `${withSlash}api/`;
})();

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically add the Token to every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});