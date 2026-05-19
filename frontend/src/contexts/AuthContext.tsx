import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import api from '../services/api';
import { isBackendUnreachableStatus } from '../services/apiError';
import { authStorage } from '../services/authStorage';
import { isAxiosError } from 'axios';
import type { AuthResponse } from '../types/auth';

interface User {
  id: number;
  email: string;
  fullName: string;
  employeeCode: string;
  position: string;
  roles: string[];
  permissions: string[];
  dashboard: string;
  mustChangePassword: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (payload: AuthResponse) => void;
  logout: () => void;
  refreshCurrentUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const unwrap = <T,>(payload: any, fallback: T): T => {
  return payload?.data?.data ?? payload?.data ?? fallback;
};

const normalizeUser = (payload: any): User => ({
  id: Number(payload.id ?? 0),
  email: payload.email ?? '',
  fullName: payload.fullName ?? '',
  employeeCode: payload.employeeCode ?? '',
  position: payload.position ?? '',
  roles: payload.roles ?? [],
  permissions: payload.permissions ?? [],
  dashboard: payload.dashboard ?? '',
  mustChangePassword: Boolean(payload.mustChangePassword),
});

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    authStorage.clearSession();
    setUser(null);
  }, []);

  const refreshCurrentUser = useCallback(async () => {
    const token = authStorage.getAccessToken();

    if (!token) {
      authStorage.clearSession();
      setUser(null);
      return;
    }

    try {
      const response = await api.get('/auth/me');
      const currentUser = normalizeUser(unwrap<any>(response, null));

      localStorage.setItem('epmsUser', JSON.stringify(currentUser));
      setUser(currentUser);
    } catch (error) {
      const status = isAxiosError(error) ? error.response?.status : undefined;
      // Keep the session when the API is down (Vite proxy 502); only clear on auth failures.
      if (status === 401 || status === 403) {
        authStorage.clearSession();
        setUser(null);
        return;
      }
      if (isBackendUnreachableStatus(status)) {
        const cached = localStorage.getItem('epmsUser');
        if (cached) {
          try {
            setUser(normalizeUser(JSON.parse(cached)));
          } catch {
            setUser(null);
          }
        }
        return;
      }
      authStorage.clearSession();
      setUser(null);
    }
  }, []);

  /**
   * Validate the session with the server before trusting localStorage.
   * Avoids showing HR shell + 403 when tokens are stale or roles/dashboard drifted.
   */
  useEffect(() => {
    const hydrate = async () => {
      setLoading(true);

      try {
        await refreshCurrentUser();
      } finally {
        setLoading(false);
      }
    };

    void hydrate();
  }, [refreshCurrentUser]);

  const login = useCallback((payload: AuthResponse) => {
    authStorage.setSession(payload);

    setUser({
      id: payload.id,
      email: payload.email,
      fullName: payload.fullName,
      employeeCode: payload.employeeCode,
      position: payload.position,
      roles: payload.roles ?? [],
      permissions: payload.permissions ?? [],
      dashboard: payload.dashboard,
      mustChangePassword: payload.mustChangePassword ?? false,
    });
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: Boolean(user),
    loading,
    login,
    logout,
    refreshCurrentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};