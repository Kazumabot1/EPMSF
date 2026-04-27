import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { authStorage } from '../services/authStorage';
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

  // Hydrate from authStorage on mount
  useEffect(() => {
    const stored = authStorage.getUser();
    if (stored && authStorage.getAccessToken()) {
      setUser(stored as User);
    }
    setLoading(false);
  }, []);

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

  const logout = useCallback(() => {
    authStorage.clearSession();
    setUser(null);
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
