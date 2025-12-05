import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authApi, usersApi, User, LoginRequest, RegisterRequest, SESSION_EXPIRED_EVENT } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionExpired: boolean;
  login: (credentials: LoginRequest) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterRequest) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  clearSessionExpired: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Handle session expired event from API
  const handleSessionExpired = useCallback(() => {
    setUser(null);
    setSessionExpired(true);
  }, []);

  // Clear session expired flag (after user acknowledges or logs in again)
  const clearSessionExpired = useCallback(() => {
    setSessionExpired(false);
  }, []);

  useEffect(() => {
    // Listen for session expired events
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, [handleSessionExpired]);

  useEffect(() => {
    // Check for existing session on mount
    const validateSession = async () => {
      const storedUser = authApi.getCurrentUser();
      const hasToken = authApi.isAuthenticated();

      if (storedUser && hasToken) {
        // Try to validate the token by making an API call
        try {
          const response = await usersApi.getMe();
          if (response.success && response.data?.user) {
            setUser(response.data.user);
          } else {
            // Token invalid, clear storage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        } catch {
          // Token invalid or server error, clear storage
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setIsLoading(false);
    };

    validateSession();
  }, []);

  const login = async (credentials: LoginRequest): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await authApi.login(credentials);
      if (response.success && response.data) {
        setUser(response.data.user);
        setSessionExpired(false); // Clear any session expired flag on successful login
        return { success: true };
      }
      return { success: false, error: response.error?.message || 'Login failed' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      return { success: false, error: message };
    }
  };

  const register = async (data: RegisterRequest): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await authApi.register(data);
      if (response.success && response.data) {
        setUser(response.data.user);
        setSessionExpired(false); // Clear any session expired flag on successful registration
        return { success: true };
      }
      return { success: false, error: response.error?.message || 'Registration failed' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    // Also update localStorage
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        sessionExpired,
        login,
        register,
        logout,
        updateUser,
        clearSessionExpired,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
