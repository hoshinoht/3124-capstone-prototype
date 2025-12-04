import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, User, LoginRequest, RegisterRequest } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterRequest) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const storedUser = authApi.getCurrentUser();
    if (storedUser && authApi.isAuthenticated()) {
      setUser(storedUser);
    }
    setIsLoading(false);
  }, []);

  const login = async (credentials: LoginRequest): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await authApi.login(credentials);
      if (response.success && response.data) {
        setUser(response.data.user);
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

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
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
