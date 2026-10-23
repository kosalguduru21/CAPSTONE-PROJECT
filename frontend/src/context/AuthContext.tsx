import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setCsrfToken, setSessionId } from '../api/client';
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
  property_manager: { email: 'manager.sunset@apartments.com', password: 'Password123!', label: 'Property Manager (Sarah Jenkins)' },
  resident: { email: 'resident.bob@sunset.com', password: 'Password123!', label: 'Resident (Bob Martinez - Unit 101)' },
  vendor_technician: { email: 'tech.mario@apexplumbing.com', password: 'Password123!', label: 'Vendor Technician (Mario Rossi - Plumbing)' },
};

const normalizeUser = (raw: any): User => ({
  ...raw,
  id: raw._id || raw.id,
  fullName: raw.name || raw.fullName || raw.email,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async (): Promise<User | null> => {
    try {
      const res = await api.get('/api/auth/me');
      const userData = res?.data?.user || res?.user;
      if (userData) {
        const normalized = normalizeUser(userData);
        setUser(normalized);
        const token = res?.data?.csrfToken || res?.csrfToken;
        if (token) {
          setCsrfToken(token);
        }
        return normalized;
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
      const res = await api.post('/api/auth/login', { email, password });
      const userData = res?.data?.user || res?.user;
      if (!userData) {
        throw new Error(res?.message || 'Authentication succeeded but user payload is missing.');
      }
      const normalized = normalizeUser(userData);
      setUser(normalized);
      const token = res?.data?.csrfToken || res?.csrfToken;
      if (token) {
        setCsrfToken(token);
      }
      return normalized;
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
      setSessionId(null);
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
