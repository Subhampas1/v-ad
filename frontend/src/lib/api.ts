import axios, { AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API Types
export interface SignupPayload {
  email: string;
  password: string;
  name: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    tier: string;
  };
}

export interface GenerateScriptPayload {
  businessType: string;
  productName: string;
  language: 'en' | 'hi' | 'te' | 'ta' | 'kn' | 'ml';
  platform: 'reels' | 'youtube' | 'whatsapp';
  tone?: 'professional' | 'casual' | 'humorous' | 'emotional';
  duration?: 15 | 30 | 60;
}

export interface Scene {
  sceneNumber: number;
  duration: number;
  visualDescription: string;
  voiceoverText: string;
  textOverlay: string;
  backgroundMusic: string;
  animation: string;
}

export interface Script {
  title: string;
  scenes: Scene[];
  audioSuggestion: string;
  background: string;
  callToAction: string;
  estimatedDuration: number;
}

export interface GenerateScriptResponse {
  success: boolean;
  script: Script;
  scriptId: string;
  generatedAt: string;
  imageAnalysis?: any;
}

export interface GenerateVideoPayload {
  scriptId: string;
  imagePath: string;
  platform: 'reels' | 'youtube' | 'whatsapp';
  businessType: string;
  productName: string;
  musicPath?: string;
  watermarkText?: string;
}

export interface GenerateVideoResponse {
  message: string;
  videoUrl?: string;
  rawVideoUrl?: string;
  adFrameUrls?: string[];
  jobId?: string;
  status?: string;
  platform: string;
  estimatedTime: string;
}

export interface JobStatus {
  jobId: string;
  state: 'queued' | 'active' | 'completed' | 'failed';
  progress: number;
  result?: {
    videoUrl: string;
    completedAt: string;
  };
  error?: string;
  timestamp: string;
}

export interface UploadResponse {
  success: boolean;
  uploadId: string;
  url: string;
  filename: string;
  size: number;
  uploadedAt: string;
}

// Auth API calls
export const authAPI = {
  signup: async (payload: SignupPayload) => {
    const res = await apiClient.post<AuthResponse>('/api/auth/signup', payload);
    return res.data;
  },
  login: async (payload: LoginPayload) => {
    const res = await apiClient.post<AuthResponse>('/api/auth/login', payload);
    return res.data;
  },
  getProfile: async () => {
    const res = await apiClient.get('/api/auth/profile');
    return res.data;
  },
};

// Script API calls
export const scriptAPI = {
  generate: async (payload: GenerateScriptPayload) => {
    const res = await apiClient.post<GenerateScriptResponse>('/api/script/generate', payload);
    return res.data;
  },
  getTemplates: async () => {
    const res = await apiClient.get('/api/script/templates');
    return res.data;
  },
  getLanguages: async () => {
    const res = await apiClient.get('/api/script/languages');
    return res.data;
  },
};

// Video API calls
export const videoAPI = {
  generate: async (payload: GenerateVideoPayload) => {
    const res = await apiClient.post<GenerateVideoResponse>('/api/video/generate', payload);
    return res.data;
  },
  getFormats: async () => {
    const res = await apiClient.get('/api/video/formats/available');
    return res.data;
  },
};

// Job API calls
export const jobAPI = {
  getStatus: async (jobId: string) => {
    const res = await apiClient.get<JobStatus>(`/api/job/${jobId}/status`);
    return res.data;
  },
  pollJob: async (jobId: string, maxWait = 30000) => {
    const res = await apiClient.post<JobStatus>(`/api/job/${jobId}/poll`, { maxWait });
    return res.data;
  },
};

// Upload API calls
export const uploadAPI = {
  image: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await apiClient.post<UploadResponse>('/api/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },
  audio: async (file: File) => {
    const formData = new FormData();
    formData.append('audio', file);
    const res = await apiClient.post<UploadResponse>('/api/upload/audio', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
};

// History types
export interface HistoryItem {
  id: string;
  type: 'image' | 'script' | 'video';
  url: string;
  metadata: Record<string, any>;
  createdAt: string;
}

// History API
export const historyAPI = {
  getAll: async (): Promise<{ items: HistoryItem[]; total: number }> => {
    const res = await apiClient.get('/api/history');
    return res.data;
  },
  getByType: async (type: 'image' | 'script' | 'video') => {
    const res = await apiClient.get(`/api/history/${type}`);
    return res.data;
  },
};
