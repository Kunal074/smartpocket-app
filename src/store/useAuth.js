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
      // Mocking the API for now until we link the local IP
      // const res = await api.post('/auth/login', { email, password });
      
      // MOCK SUCCESS
      const mockToken = 'mock_jwt_token_12345';
      const mockUser = { id: 1, name: 'Kunal', email };
      
      await AsyncStorage.setItem('auth_token', mockToken);
      set({ user: mockUser, token: mockToken, isLoading: false });
      return true;
    } catch (err) {
      set({ error: err.message || 'Login failed', isLoading: false });
      return false;
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem('auth_token');
    set({ user: null, token: null });
  }
}));
