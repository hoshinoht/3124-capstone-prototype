const API_BASE_URL = 'http://127.0.0.1:8080/api';

// Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  department: string;
  role: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  department: string;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user: User;
    token: string;
    expiresAt: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  urgency: 'urgent' | 'high' | 'medium' | 'low';
  status: 'pending' | 'in-progress' | 'completed';
  department: string;
  projectId?: string;
  projectName?: string;
  assigneeId?: string;
  deadline: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  isCompleted: boolean;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'completed' | 'archived';
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
  memberCount?: number;
  taskCount?: number;
}

export interface ProjectMember {
  id: string;
  userId: string;
  name: string;
  role: 'owner' | 'admin' | 'member';
  addedAt: string;
}

export interface DashboardData {
  stats: {
    activeProjects: number;
    teamMembers: number;
    completedTasks: number;
    meetingsToday: number;
    pendingTasks: number;
    urgentTasks: number;
  };
  recentMeetings: Array<{
    id: string;
    title: string;
    description?: string;
    date: string;
    startTime: string;
    endTime?: string;
    status: 'upcoming' | 'completed';
    host: string;
  }>;
  quickLinks: Array<{
    id: string;
    title: string;
    url: string;
    subtitle?: string;
    schedule?: string;
  }>;
}

// API helper
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  // Handle 401 Unauthorized - clear stored auth and redirect
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Don't throw, just return a structured error response
    throw new Error('Session expired. Please log in again.');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'An error occurred');
  }

  return data;
}

// Auth API
export const authApi = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response = await apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.success && response.data) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response;
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (response.success && response.data) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response;
  },

  logout: async (): Promise<void> => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },

  refreshToken: async (): Promise<{ token: string; expiresAt: string }> => {
    const response = await apiRequest<{ success: boolean; data: { token: string; expiresAt: string } }>(
      '/auth/refresh',
      { method: 'POST' }
    );

    if (response.success && response.data) {
      localStorage.setItem('token', response.data.token);
    }

    return response.data;
  },

  getCurrentUser: (): User | null => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('token');
  },
};

// Dashboard API
export const dashboardApi = {
  getData: async (): Promise<{ success: boolean; data: DashboardData }> => {
    return apiRequest('/dashboard/data');
  },
};

// Tasks API
export const tasksApi = {
  getAll: async (params?: {
    status?: string;
    urgency?: string;
    department?: string;
    projectId?: string;
    isCompleted?: boolean;
  }): Promise<{ success: boolean; data: { tasks: Task[]; pagination: { total: number } } }> => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return apiRequest(`/tasks${query ? `?${query}` : ''}`);
  },

  getUrgent: async (): Promise<{ success: boolean; data: { tasks: Task[]; count: number } }> => {
    return apiRequest('/tasks/urgent');
  },

  create: async (task: {
    title: string;
    description?: string;
    urgency: string;
    department: string;
    deadline: string;
    projectId?: string;
    assigneeId?: string;
    isCompleted?: boolean;
  }): Promise<{ success: boolean; data: { task: Task } }> => {
    return apiRequest('/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  },

  update: async (
    taskId: string,
    updates: Partial<{
      title: string;
      description: string;
      urgency: string;
      department: string;
      deadline: string;
      projectId: string;
      assigneeId: string;
      isCompleted: boolean;
    }>
  ): Promise<{ success: boolean; data: { task: Task } }> => {
    return apiRequest(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  updateStatus: async (
    taskId: string,
    status: string
  ): Promise<{ success: boolean; data: { task: { id: string; status: string } } }> => {
    return apiRequest(`/tasks/${taskId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  delete: async (taskId: string): Promise<{ success: boolean; message: string }> => {
    return apiRequest(`/tasks/${taskId}`, { method: 'DELETE' });
  },
};

// Users API
export const usersApi = {
  getMe: async (): Promise<{ success: boolean; data: { user: User } }> => {
    return apiRequest('/users/me');
  },

  updateMe: async (
    updates: Partial<{ firstName: string; lastName: string; department: string }>
  ): Promise<{ success: boolean; data: { user: User } }> => {
    return apiRequest('/users/me', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  getAll: async (): Promise<{ success: boolean; data: { users: User[] } }> => {
    return apiRequest('/users');
  },
};

// Equipment API
export const equipmentApi = {
  getAll: async (): Promise<{ success: boolean; data: { equipment: any[] } }> => {
    return apiRequest('/equipment');
  },

  getById: async (equipmentId: string): Promise<{ success: boolean; data: { equipment: any } }> => {
    return apiRequest(`/equipment/${equipmentId}`);
  },

  getMyBookings: async (): Promise<{ success: boolean; data: { bookings: any[] } }> => {
    return apiRequest('/equipment/bookings/me');
  },

  createBooking: async (
    equipmentId: string,
    booking: {
      startDate: string;
      endDate: string;
      purpose: string;
    }
  ): Promise<{ success: boolean; data: { booking: any } }> => {
    return apiRequest(`/equipment/${equipmentId}/bookings`, {
      method: 'POST',
      body: JSON.stringify({
        startDate: booking.startDate,
        endDate: booking.endDate,
        purpose: booking.purpose,
      }),
    });
  },

  checkAvailability: async (
    equipmentId: string,
    startDate: string,
    endDate: string
  ): Promise<{ success: boolean; data: { isAvailable: boolean; conflicts: any[] } }> => {
    return apiRequest(`/equipment/${equipmentId}/check-availability`, {
      method: 'POST',
      body: JSON.stringify({
        startDate: startDate,
        endDate: endDate,
      }),
    });
  },

  cancelBooking: async (bookingId: string): Promise<{ success: boolean }> => {
    return apiRequest(`/equipment/bookings/${bookingId}`, { method: 'DELETE' });
  },
};

// Glossary API
export const glossaryApi = {
  getTerms: async (params?: {
    search?: string;
    categoryId?: string;
  }): Promise<{ success: boolean; data: { terms: any[] } }> => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value);
        }
      });
    }
    const query = searchParams.toString();
    return apiRequest(`/glossary/terms${query ? `?${query}` : ''}`);
  },

  createTerm: async (term: {
    term: string;
    definition: string;
    categoryId?: string;
    department?: string;
  }): Promise<{ success: boolean; data: { term: any } }> => {
    return apiRequest('/glossary/terms', {
      method: 'POST',
      body: JSON.stringify({
        term: term.term,
        definition: term.definition,
        categoryId: term.categoryId,
        department: term.department,
      }),
    });
  },
};

// Notifications API
export const notificationsApi = {
  getAll: async (): Promise<{ success: boolean; data: { notifications: any[] } }> => {
    return apiRequest('/notifications');
  },

  markAsRead: async (notificationId: string): Promise<{ success: boolean }> => {
    return apiRequest(`/notifications/${notificationId}/read`, { method: 'PATCH' });
  },

  markAllAsRead: async (): Promise<{ success: boolean }> => {
    return apiRequest('/notifications/read-all', { method: 'PATCH' });
  },
};

// Locations API
export const locationsApi = {
  getCurrent: async (): Promise<{ success: boolean; data: { activeCheckIns: any[] } }> => {
    return apiRequest('/locations/current');
  },

  getTodayRecords: async (): Promise<{ success: boolean; data: { records: any[]; total: number } }> => {
    return apiRequest('/locations/today');
  },

  getMyStatus: async (): Promise<{ success: boolean; data: { history: any[] } }> => {
    return apiRequest('/locations/history/me?limit=1');
  },

  getHistory: async (params?: {
    userId?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ success: boolean; data: { records: any[] } }> => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value);
        }
      });
    }
    const query = searchParams.toString();
    return apiRequest(`/locations/history${query ? `?${query}` : ''}`);
  },

  checkIn: async (location: string): Promise<{ success: boolean; data: { record: any } }> => {
    return apiRequest('/locations/check-in', {
      method: 'POST',
      body: JSON.stringify({ location }),
    });
  },

  checkOut: async (): Promise<{ success: boolean; data: { record: any } }> => {
    return apiRequest('/locations/check-out', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },
};

// Events API
export const eventsApi = {
  getAll: async (params?: {
    startDate?: string;
    endDate?: string;
    type?: string;
  }): Promise<{ success: boolean; data: { events: any[] } }> => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value);
        }
      });
    }
    const query = searchParams.toString();
    return apiRequest(`/calendar/events${query ? `?${query}` : ''}`);
  },

  create: async (event: {
    title: string;
    description?: string;
    eventType: string;
    eventDate: string;
    startTime: string;
    endTime?: string;
    location?: string;
    department?: string;
  }): Promise<{ success: boolean; data: { event: any } }> => {
    return apiRequest('/calendar/events', {
      method: 'POST',
      body: JSON.stringify(event),
    });
  },
};

// Projects API
export const projectsApi = {
  getAll: async (params?: {
    status?: string;
    search?: string;
  }): Promise<{ success: boolean; data: { projects: Project[]; total: number } }> => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value);
        }
      });
    }
    const query = searchParams.toString();
    return apiRequest(`/projects${query ? `?${query}` : ''}`);
  },

  getById: async (projectId: string): Promise<{ success: boolean; data: { project: Project } }> => {
    return apiRequest(`/projects/${projectId}`);
  },

  create: async (project: {
    name: string;
    description?: string;
    status?: string;
    memberIds?: string[];
  }): Promise<{ success: boolean; data: { project: Project } }> => {
    return apiRequest('/projects', {
      method: 'POST',
      body: JSON.stringify(project),
    });
  },

  update: async (
    projectId: string,
    updates: Partial<{
      name: string;
      description: string;
      status: string;
    }>
  ): Promise<{ success: boolean; data: { project: Project } }> => {
    return apiRequest(`/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  delete: async (projectId: string): Promise<{ success: boolean; message: string }> => {
    return apiRequest(`/projects/${projectId}`, { method: 'DELETE' });
  },

  getMembers: async (projectId: string): Promise<{ success: boolean; data: { members: ProjectMember[]; total: number } }> => {
    return apiRequest(`/projects/${projectId}/members`);
  },

  addMember: async (
    projectId: string,
    data: { userId: string; role?: string }
  ): Promise<{ success: boolean; data: { member: ProjectMember } }> => {
    return apiRequest(`/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  removeMember: async (projectId: string, userId: string): Promise<{ success: boolean; message: string }> => {
    return apiRequest(`/projects/${projectId}/members/${userId}`, { method: 'DELETE' });
  },

  getTasks: async (projectId: string): Promise<{ success: boolean; data: { tasks: Task[]; total: number } }> => {
    return apiRequest(`/projects/${projectId}/tasks`);
  },
};

// Quick Links API
export const quickLinksApi = {
  getAll: async (): Promise<{ success: boolean; data: { links: any[] } }> => {
    return apiRequest('/quick-links');
  },

  create: async (link: {
    title: string;
    url: string;
    description?: string;
    department?: string;
  }): Promise<{ success: boolean; data: { link: any } }> => {
    return apiRequest('/quick-links', {
      method: 'POST',
      body: JSON.stringify(link),
    });
  },
};

export default {
  auth: authApi,
  dashboard: dashboardApi,
  tasks: tasksApi,
  users: usersApi,
  equipment: equipmentApi,
  glossary: glossaryApi,
  notifications: notificationsApi,
  locations: locationsApi,
  events: eventsApi,
  quickLinks: quickLinksApi,
  projects: projectsApi,
};
