import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface User {
  id: number;
  email: string;
  fullName: string;
  employeeCode: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (user: User) => void;
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

  useEffect(() => {
    const token = localStorage.getItem('token');
    const fullName = localStorage.getItem('fullName');
    const email = localStorage.getItem('email');
    const id = localStorage.getItem('id');
    const employeeCode = localStorage.getItem('employeeCode');

    if (token && fullName && email && id && employeeCode) {
      setUser({
        id: parseInt(id),
        email,
        fullName,
        employeeCode,
      });
    }
    setLoading(false);
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('token', 'dummy-token'); // Assuming token is set elsewhere
    localStorage.setItem('fullName', userData.fullName);
    localStorage.setItem('email', userData.email);
    localStorage.setItem('id', userData.id.toString());
    localStorage.setItem('employeeCode', userData.employeeCode);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('fullName');
    localStorage.removeItem('email');
    localStorage.removeItem('id');
    localStorage.removeItem('employeeCode');
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
