import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';

export const useAuth = create((set) => ({
  user: null,
  token: null,
  isLoading: true,
  error: null,
  isFirstLaunch: null,
  shakeToAdd: true, // Default to true

  setUser: (user) => set({ user }),
  
  setShakeToAdd: async (value) => {
    try {
      await AsyncStorage.setItem('shake_to_add', value ? 'true' : 'false');
      set({ shakeToAdd: value });
    } catch (e) {
      console.warn('Failed to save shake_to_add preference', e);
    }
  },

  // Initialize: check if we have a token saved
  initAuth: async () => {
    try {
      const [token, onboardingFlag, shakeFlag] = await Promise.all([
        AsyncStorage.getItem('auth_token'),
        AsyncStorage.getItem('has_completed_onboarding'),
        AsyncStorage.getItem('shake_to_add')
      ]);
      
      const isFirst = onboardingFlag !== 'true';
      const isShakeEnabled = shakeFlag !== 'false'; // defaults to true

      if (token) {
        // Fetch user profile
        try {
          // Set token first so api requests have it
          set({ token, shakeToAdd: isShakeEnabled });
          const res = await api.get('/auth/me');
          set({ user: res.data.user, isLoading: false, isFirstLaunch: isFirst });
        } catch (err) {
          // If token is invalid
          set({ token: null, user: null, isLoading: false, isFirstLaunch: isFirst });
          await AsyncStorage.removeItem('auth_token');
        }
      } else {
        set({ token: null, user: null, isLoading: false, isFirstLaunch: isFirst, shakeToAdd: isShakeEnabled });
      }
    } catch (e) {
      set({ isLoading: false, isFirstLaunch: true });
    }
  },

  completeOnboarding: async () => {
    try {
      await AsyncStorage.setItem('has_completed_onboarding', 'true');
      set({ isFirstLaunch: false });
    } catch (e) {
      console.error('Failed to set onboarding flag', e);
    }
  },

  login: async (email, password) => {
    set({ error: null });
    try {
      const res = await api.post('/auth/login', { email, password });
      const realToken = res.data.token;
      const realUser = res.data.user;
      await AsyncStorage.setItem('auth_token', realToken);
      set({ user: realUser, token: realToken });
      return true;
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Login failed';
      set({ error: message });
      throw err; // re-throw so LoginScreen can read the specific message
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem('auth_token');
    set({ user: null, token: null });
  }
}));
