import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => axios.post(`${API_BASE_URL}/auth/register`, data),
  login: (data) => axios.post(`${API_BASE_URL}/auth/login`, data),
  getCurrentUser: () => api.get('/users/me'),
  getAllUsers: () => api.get('/users'),
  getUsersByDepartment: (department) => api.get(`/users/department/${department}`),
};

// Calendar API
export const calendarAPI = {
  createEvent: (data) => api.post('/calendar', data),
  getEvents: (params) => api.get('/calendar', { params }),
  getEventById: (id) => api.get(`/calendar/${id}`),
  updateEvent: (id, data) => api.put(`/calendar/${id}`, data),
  deleteEvent: (id) => api.delete(`/calendar/${id}`),
};

// Equipment API
export const equipmentAPI = {
  createEquipment: (data) => api.post('/equipment', data),
  getAllEquipment: () => api.get('/equipment'),
  getAvailableEquipment: (params) => api.get('/equipment/available', { params }),
};

// Booking API
export const bookingAPI = {
  createBooking: (data) => api.post('/bookings', data),
  getAllBookings: (params) => api.get('/bookings', { params }),
  getUserBookings: () => api.get('/bookings/my'),
  updateBookingStatus: (id, status) => api.put(`/bookings/${id}/status`, { status }),
  deleteBooking: (id) => api.delete(`/bookings/${id}`),
};

// Task API
export const taskAPI = {
  createTask: (data) => api.post('/tasks', data),
  getAllTasks: (params) => api.get('/tasks', { params }),
  getUrgentTasks: () => api.get('/tasks/urgent'),
  getUserTasks: () => api.get('/tasks/my'),
  getTaskById: (id) => api.get(`/tasks/${id}`),
  updateTask: (id, data) => api.put(`/tasks/${id}`, data),
  deleteTask: (id) => api.delete(`/tasks/${id}`),
};

// Personnel API
export const personnelAPI = {
  updateStatus: (data) => api.post('/personnel/status', data),
  getAllStatuses: () => api.get('/personnel/status'),
  getUserStatus: () => api.get('/personnel/status/me'),
  getStatusHistory: (userId, params) => api.get(`/personnel/status/history/${userId}`, { params }),
  getStatusesByDepartment: (department) => api.get(`/personnel/status/department/${department}`),
};

// Quick Links API
export const quickLinksAPI = {
  createQuickLink: (data) => api.post('/quick-links', data),
  getAllQuickLinks: () => api.get('/quick-links'),
  getPinnedQuickLinks: () => api.get('/quick-links/pinned'),
  getQuickLinkById: (id) => api.get(`/quick-links/${id}`),
  updateQuickLink: (id, data) => api.put(`/quick-links/${id}`, data),
  deleteQuickLink: (id) => api.delete(`/quick-links/${id}`),
};

// Glossary API
export const glossaryAPI = {
  getAllCategories: () => api.get('/glossary/categories'),
  createTerm: (data) => api.post('/glossary/terms', data),
  getAllTerms: (params) => api.get('/glossary/terms', { params }),
  searchTerms: (query) => api.post('/glossary/terms/search', { query }),
  getTermById: (id) => api.get(`/glossary/terms/${id}`),
  updateTerm: (id, data) => api.put(`/glossary/terms/${id}`, data),
  deleteTerm: (id) => api.delete(`/glossary/terms/${id}`),
};

export default api;
