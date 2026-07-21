import AsyncStorage from '@react-native-async-storage/async-storage';
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
  refreshUser: () => Promise<void>;
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
        const parsedUser = JSON.parse(userData);
        // Verify user still exists in backend (in case DB was reset or user deleted)
        const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
        try {
          const res = await fetch(`${BACKEND_URL}/api/players/${parsedUser.id}`);
          if (res.ok) {
            const fresh = await res.json();
            if (fresh.is_active) {
              // Update with fresh data from backend (in case role/balance changed)
              const updated = {
                id: fresh.id,
                name: fresh.name,
                role: fresh.role,
                balance: fresh.balance,
                phone: fresh.phone,
              };
              setUser(updated);
              await storage.setItem('user', JSON.stringify(updated));
            } else {
              // User deactivated - clear session
              await storage.removeItem('user');
            }
          } else {
            // User doesn't exist anymore - clear stale session
            await storage.removeItem('user');
          }
        } catch (netError) {
          // Network error - keep local cached user
          setUser(parsedUser);
        }
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
    if (userData.token) 
      {
        await AsyncStorage.setItem("token", userData.token);
      }
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

  const refreshUser = async () => {
    if (!user) return;
    const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
    try {
      const res = await fetch(`${BACKEND_URL}/api/players/${user.id}`);
      if (res.ok) {
        const fresh = await res.json();
        const updated = {
          id: fresh.id,
          name: fresh.name,
          role: fresh.role,
          balance: fresh.balance,
          phone: fresh.phone,
        };
        setUser(updated);
        await storage.setItem('user', JSON.stringify(updated));
      }
    } catch (e) {
      // Ignore
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateBalance, refreshUser, isLoading }}>
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
