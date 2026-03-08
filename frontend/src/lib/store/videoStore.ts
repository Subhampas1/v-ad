import { create } from 'zustand';
import { JobStatus } from '@/lib/api';

interface VideoState {
  scriptId: string | null;
  imageUrl: string | null;
  imagePath: string | null;
  selectedPlatform: 'reels' | 'youtube' | 'whatsapp' | null;
  businessType: string | null;
  productName: string | null;
  musicPath: string | null;
  watermarkText: string | null;

  currentJobId: string | null;
  jobStatus: JobStatus | null;
  isGenerating: boolean;
  generationError: string | null;
  generatedVideoUrl: string | null;

  setScript: (scriptId: string) => void;
  setImage: (url: string, path: string) => void;
  setBusinessInfo: (businessType: string, productName: string) => void;
  setPlatform: (platform: 'reels' | 'youtube' | 'whatsapp') => void;
  setMusicPath: (path: string | null) => void;
  setWatermarkText: (text: string | null) => void;

  setCurrentJob: (jobId: string) => void;
  updateJobStatus: (status: JobStatus) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setGenerationError: (error: string | null) => void;
  setGeneratedVideoUrl: (url: string | null) => void;

  reset: () => void;
}

const initialState = {
  scriptId: null,
  imageUrl: null,
  imagePath: null,
  selectedPlatform: null,
  businessType: null,
  productName: null,
  musicPath: null,
  watermarkText: null,
  currentJobId: null,
  jobStatus: null,
  isGenerating: false,
  generationError: null,
  generatedVideoUrl: null,
};

export const useVideoStore = create<VideoState>((set) => ({
  ...initialState,

  setScript: (scriptId) => set({ scriptId }),
  setImage: (url, path) => set({ imageUrl: url, imagePath: path }),
  setBusinessInfo: (businessType, productName) =>
    set({ businessType, productName }),
  setPlatform: (platform) => set({ selectedPlatform: platform }),
  setMusicPath: (path) => set({ musicPath: path }),
  setWatermarkText: (text) => set({ watermarkText: text }),

  setCurrentJob: (jobId) => set({ currentJobId: jobId }),
  updateJobStatus: (status) => set({ jobStatus: status }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setGenerationError: (error) => set({ generationError: error }),
  setGeneratedVideoUrl: (url) => set({ generatedVideoUrl: url }),

  reset: () => set(initialState),
}));
