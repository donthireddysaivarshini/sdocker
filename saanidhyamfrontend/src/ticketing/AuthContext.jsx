import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { apiClient } from './apiClient'; 

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // On App Start: Check if a valid token exists
    const token = localStorage.getItem('access_token');
    if (token) {
        try {
            const decoded = jwtDecode(token);
            
            // If valid, restore the session using dynamic data from the token
            setUser({ 
                id: decoded.user_id, 
                name: decoded.name || 'User', 
                role: decoded.role || 'agent' 
            });
        } catch (e) {
            // If invalid (expired), clear it
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
        }
    }
    setLoading(false);
  }, []);

const login = async (username, pass) => {
  try {
    const response = await apiClient.post('token/', {
      username,
      password: pass,
    });

    localStorage.setItem('access_token', response.data.access);
    localStorage.setItem('refresh_token', response.data.refresh);

    const decoded = jwtDecode(response.data.access);

    setUser({
      id: decoded.user_id,
      name: decoded.name || 'User',
      role: decoded.role || 'agent',
    });

    return { error: null };
  } catch {
    return {
      error: {
        message: 'Invalid username or password',
      },
    };
  }
};



  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};