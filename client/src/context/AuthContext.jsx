import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const res = await authService.getMe();
          if (res.success && res.user) {
            setUser(res.user);
            localStorage.setItem('user', JSON.stringify(res.user));
          }
        } catch (error) {
          console.warn('Session check failed. Logging out.', error.message);
          logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const res = await authService.login({ email, password });
      if (res.success && res.token) {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        setToken(res.token);
        setUser(res.user);
        toast.success(`Welcome back, ${res.user.name}!`);
        return res.user;
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Invalid credentials. Please try again.';
      toast.error(msg);
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const res = await authService.register(userData);
      if (res.success && res.token) {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        setToken(res.token);
        setUser(res.user);
        toast.success('Account created successfully!');
        return res.user;
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Registration failed.';
      toast.error(msg);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (e) {
      console.warn('Logout notification error:', e.message);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    toast.success('Logged out successfully.');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token && !!user,
        isAdmin: user?.role === 'ADMIN',
        isHR: user?.role === 'HR',
        isEmployee: user?.role === 'Employee',
        isClient: user?.role === 'CLIENT',
        login,
        register,
        logout
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
