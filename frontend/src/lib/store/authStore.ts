import { create } from 'zustand';
import { authAPI } from '@/lib/api';

export interface User {
  id: string;
  email: string;
  name: string;
  tier: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { token, user } = await authAPI.login({ email, password });
      localStorage.setItem('auth_token', token);
      set({ user, token, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  signup: async (email, password, name) => {
    set({ isLoading: true, error: null });
    try {
      const { token, user } = await authAPI.signup({ email, password, name });
      localStorage.setItem('auth_token', token);
      set({ user, token, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Signup failed';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('auth_token');
    set({ user: null, token: null });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      set({ user: null, token: null });
      return;
    }

    try {
      const profile = await authAPI.getProfile();
      set({ user: profile.user, token });
    } catch {
      localStorage.removeItem('auth_token');
      set({ user: null, token: null });
    }
  },
}));
