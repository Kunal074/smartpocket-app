import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';

export const useAuth = create((set) => ({
  user: null,
  token: null,
  isLoading: true,
  error: null,

  // Initialize: check if we have a token saved
  initAuth: async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        // Here we could verify the token with the backend
        set({ token, isLoading: false });
        // Optional: fetch user profile
      } else {
        set({ isLoading: false });
      }
    } catch (e) {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      // Connect to the real PERN backend!
      const res = await api.post('/auth/login', { email, password });
      
      const realToken = res.data.token;
      const realUser = res.data.user;
      
      await AsyncStorage.setItem('auth_token', realToken);
      set({ user: realUser, token: realToken, isLoading: false });
      return true;
    } catch (err) {
      // Axios error handling
      const message = err.response?.data?.error || err.message || 'Login failed';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem('auth_token');
    set({ user: null, token: null });
  }
}));
