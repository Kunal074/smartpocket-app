import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Replace with your computer's local IP address when testing on a physical phone
// e.g. http://192.168.1.15:3000/api
export const API_URL = 'http://192.168.1.X:3000/api'; 

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
