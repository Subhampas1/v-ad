import 'dotenv/config';

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';

import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';

// Import routes
import authRoutes from './api/routes/auth.js';
import jobRoutes from './api/routes/job.js';
import scriptRoutes from './api/routes/script.js';
import uploadRoutes from './api/routes/upload.js';
import videoRoutes from './api/routes/video.js';
import historyRoutes from './api/routes/history.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure required directories exist
const uploadDir = process.env.VIDEO_TEMP_DIR || './temp';
const videoDir = process.env.VIDEO_OUTPUT_DIR || './videos';
await fs.mkdir(uploadDir, { recursive: true });
await fs.mkdir(videoDir, { recursive: true });

// CORS — allow frontend dev server and production origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (curl, mobile apps)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files locally (fallback when S3 not configured)
app.use('/uploads', express.static(path.join(process.cwd(), 'temp')));

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info({ method: req.method, path: req.path });
  next();
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mockMode: process.env.VIDEO_MOCK === 'true',
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/job', jobRoutes);
app.use('/api/script', scriptRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/video', videoRoutes);
app.use('/api/history', historyRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: { message: 'Route not found', status: 404, code: 'NOT_FOUND' } });
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🎬 Video mock mode: ${process.env.VIDEO_MOCK === 'true' ? 'ON' : 'OFF'}`);
  logger.info(`🔒 Auth: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Supabase configured' : 'No Supabase (demo mode)'}`);
});

export default app;
