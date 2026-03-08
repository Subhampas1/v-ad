import { logger } from '../utils/logger.js';

// Note: BullMQ/Redis has been removed. Video generation now runs synchronously.
// This file provides stub implementations for backward compatibility.

export interface VideoJobData {
  jobId: string;
  userId: string;
  scriptId: string;
  imagePath: string;
  platform: 'reels' | 'youtube' | 'whatsapp';
  businessType: string;
  productName: string;
  musicPath?: string;
  watermarkText?: string;
  createdAt: Date;
}

export interface JobStatus {
  state: 'completed';
  progress: 100;
  result?: string;
  error?: string;
}

// Stub implementations - no longer used since video generation is synchronous
export const getVideoQueue = () => {
  logger.warn('getVideoQueue called but BullMQ has been removed');
  return null;
};

export const videoQueue = {
  add: async () => { throw new Error('BullMQ removed - video generation is now synchronous'); },
  getJob: async () => null,
  getJobCounts: async () => ({ waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 }),
  clean: async () => {},
  process: () => {},
  on: () => {},
};

export const createVideoJob = async (data: VideoJobData): Promise<string> => {
  logger.info('Video generation is now synchronous, no job queue needed');
  return `sync_${Date.now()}`;
};

export const getJobStatus = async (jobId: string): Promise<JobStatus> => {
  // Since video generation is synchronous, jobs complete immediately
  return {
    state: 'completed',
    progress: 100,
    result: 'Video generated synchronously',
  };
};

export const getQueueStats = async () => {
  return {
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
    delayed: 0,
  };
};

export const clearQueue = async () => {
  logger.info('Queue cleared (no-op - BullMQ removed)');
};

