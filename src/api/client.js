import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Production backend on Vercel
export const API_URL = 'https://smartpocket.vercel.app/api';

export const api = axios.create({
  baseURL: API_URL,
});

// Automatically attach the JWT token to every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
