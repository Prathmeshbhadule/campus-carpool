import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('mitaoe_carpool_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('mitaoe_carpool_token'));
  const [loading, setLoading] = useState(true);

  // Sync session on startup
  useEffect(() => {
    const checkSession = async () => {
      if (token) {
        try {
          const res = await apiClient.get('/auth/me');
          if (res.data?.user) {
            setUser(res.data.user);
            localStorage.setItem('mitaoe_carpool_user', JSON.stringify(res.data.user));
          }
        } catch (err) {
          console.warn('[Auth] Session validation failed:', err.message);
          setToken(null);
          setUser(null);
          localStorage.removeItem('mitaoe_carpool_token');
          localStorage.removeItem('mitaoe_carpool_user');
        }
      }
      setLoading(false);
    };

    checkSession();
  }, [token]);

  const login = async (email, password) => {
    const res = await apiClient.post('/auth/login', { email, password });
    const { token: receivedToken, user: receivedUser } = res.data;
    setToken(receivedToken);
    setUser(receivedUser);
    localStorage.setItem('mitaoe_carpool_token', receivedToken);
    localStorage.setItem('mitaoe_carpool_user', JSON.stringify(receivedUser));
    return receivedUser;
  };

  const register = async (userData) => {
    const res = await apiClient.post('/auth/register', userData);
    const { token: receivedToken, user: receivedUser } = res.data;
    setToken(receivedToken);
    setUser(receivedUser);
    localStorage.setItem('mitaoe_carpool_token', receivedToken);
    localStorage.setItem('mitaoe_carpool_user', JSON.stringify(receivedUser));
    return receivedUser;
  };

  const logout = async () => {
    try {
      if (token) {
        await apiClient.post('/auth/logout');
      }
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('mitaoe_carpool_token');
      localStorage.removeItem('mitaoe_carpool_user');
    }
  };

  const updateUserData = (updatedFields) => {
    setUser((prev) => {
      const merged = { ...prev, ...updatedFields };
      localStorage.setItem('mitaoe_carpool_user', JSON.stringify(merged));
      return merged;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user && !!token,
        isAdmin: user?.role === 'admin',
        isFaculty: user?.role === 'faculty',
        isStudent: user?.role === 'student',
        login,
        register,
        logout,
        updateUserData
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
