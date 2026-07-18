import React, { createContext, useState, useContext, useEffect } from 'react';
import { storage } from '@/src/utils/storage';

interface User {
  id: string;
  name: string;
  role: string;
  balance: number;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  login: (name: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
  updateBalance: (newBalance: number) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await storage.getItem('user', null);
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (name: string, pin: string) => {
    const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
    
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, pin }),
    });

    if (!response.ok) {
      throw new Error('Invalid credentials');
    }

    const userData = await response.json();
    setUser(userData);
    await storage.setItem('user', JSON.stringify(userData));
  };

  const logout = async () => {
    setUser(null);
    await storage.removeItem('user');
  };

  const updateBalance = (newBalance: number) => {
    if (user) {
      const updatedUser = { ...user, balance: newBalance };
      setUser(updatedUser);
      storage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateBalance, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
