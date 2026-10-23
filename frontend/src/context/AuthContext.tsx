import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setCsrfToken } from '../api/client';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<User>;
  logout: () => Promise<void>;
  register: (payload: { email: string; password?: string; fullName: string; role?: UserRole; invitationToken?: string }) => Promise<void>;
  refreshUser: () => Promise<User | null>;
  switchDemoAccount: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DEMO_CREDENTIALS = {
  property_manager: { email: 'manager.sarah@grandheights.com', password: 'Password123!', label: 'Property Manager (Sarah Jenkins)' },
  resident: { email: 'resident.alex@grandheights.com', password: 'Password123!', label: 'Resident (Alex Rivera - Unit 101)' },
  vendor_technician: { email: 'tech.mario@quickflow.com', password: 'Password123!', label: 'Vendor Technician (Mario Rossi - Plumbing)' },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async (): Promise<User | null> => {
    try {
      const data = await api.get('/api/auth/me');
      if (data?.user) {
        setUser(data.user);
        if (data.csrfToken) {
          setCsrfToken(data.csrfToken);
        }
        return data.user;
      }
      setUser(null);
      return null;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email: string, password = 'Password123!'): Promise<User> => {
    setLoading(true);
    try {
      const data = await api.post('/api/auth/login', { email, password });
      setUser(data.user);
      if (data.csrfToken) {
        setCsrfToken(data.csrfToken);
      }
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api.post('/api/auth/logout');
    } catch (err) {
      console.warn('Logout network notice:', err);
    } finally {
      setUser(null);
      setCsrfToken(null);
      setLoading(false);
    }
  };

  const register = async (payload: { email: string; password?: string; fullName: string; role?: UserRole; invitationToken?: string }) => {
    await api.post('/api/auth/register', {
      ...payload,
      password: payload.password || 'Password123!',
    });
  };

  const switchDemoAccount = async (role: UserRole) => {
    const creds = DEMO_CREDENTIALS[role];
    if (creds) {
      await login(creds.email, creds.password);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        register,
        refreshUser: fetchCurrentUser,
        switchDemoAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
