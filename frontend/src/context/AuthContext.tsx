'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, loginUser, registerUser } from '@/lib/api';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string, role: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Restore session from localStorage
    const savedToken = localStorage.getItem('interview_agent_token');
    const savedUser = localStorage.getItem('interview_agent_user');
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Failed to parse cached auth user:', e);
      }
    }
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await loginUser(email, pass);
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('interview_agent_token', res.token);
    localStorage.setItem('interview_agent_user', JSON.stringify(res.user));
  };

  const register = async (email: string, pass: string, name: string, targetRole: string) => {
    const res = await registerUser(email, pass, name, targetRole);
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('interview_agent_token', res.token);
    localStorage.setItem('interview_agent_user', JSON.stringify(res.user));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('interview_agent_token');
    localStorage.removeItem('interview_agent_user');
  };

  const updateProfile = (data: Partial<UserProfile>) => {
    if (!user) return;
    const updated = { ...user, ...data };
    setUser(updated);
    localStorage.setItem('interview_agent_user', JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateProfile,
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
