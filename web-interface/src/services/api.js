import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050/api/v1',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sdg_token');
  const student4Token = localStorage.getItem('sdg_student4_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (student4Token) {
    config.headers['X-Student4-Token'] = student4Token;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // HashRouter keeps the app route in the hash (e.g. #/dashboard).
      const path = (window.location.hash.replace(/^#/, '') || '/').split('?')[0];
      const isAuthPage =
        path === '/login' || path === '/register' || path === '/admin-login';
      const reqUrl = String(error.config?.url || '');
      // Don't wipe session for auth attempts themselves
      const isAuthRequest =
        reqUrl.includes('/auth/login') ||
        reqUrl.includes('/auth/student-login') ||
        reqUrl.includes('/auth/register') ||
        reqUrl.includes('/admin-login');

      if (!isAuthPage && !isAuthRequest) {
        localStorage.removeItem('sdg_token');
        localStorage.removeItem('sdg_student4_token');
        localStorage.removeItem('sdg_role');
        localStorage.removeItem('sdg_name');
        window.location.hash = path.startsWith('/admin') ? '#/admin-login' : '#/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
