import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import { uploadToS3 } from '../../services/storage.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { logger } from '../../utils/logger.js';
import { addHistoryItem } from './history.js';

const router = express.Router();

const uploadDir = process.env.VIDEO_TEMP_DIR || './temp';

// Ensure upload temp directory exists before multer tries to write to it
await fs.mkdir(uploadDir, { recursive: true }).catch(() => { });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req: any, file: any, cb: any) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'img-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req: any, file: any, cb: any) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      cb(new ApiError('Only JPEG, PNG, and WebP images are allowed', 400, 'INVALID_FILE_TYPE'));
    } else {
      cb(null, true);
    }
  },
});

// Upload image
router.post('/image', upload.single('image'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new ApiError('No file uploaded', 400, 'NO_FILE');
    }

    logger.info(`Image uploaded locally: ${req.file.filename}`);

    const uploadId = `upload_${Date.now()}`;
    const s3Key = `uploads/${uploadId}/${req.file.filename}`;

    // Try S3 upload; fall back to local URL if credentials not configured
    let fileUrl: string;
    try {
      fileUrl = await uploadToS3(req.file.path, {
        bucket: process.env.S3_UPLOAD_BUCKET || 'v-ad-uploads',
        key: s3Key,
        contentType: req.file.mimetype,
        metadata: {
          uploadId,
          originalName: req.file.originalname,
          uploadedAt: new Date().toISOString(),
        },
      });
    } catch (s3Err: any) {
      logger.warn({ err: s3Err }, 'S3 upload failed — serving local file via /uploads endpoint');
      // Keep file locally and serve via a local URL
      fileUrl = `/uploads/${req.file.filename}`;
    }

    logger.info(`Image available at: ${fileUrl}`);

    addHistoryItem({
      type: 'image',
      url: fileUrl,
      metadata: {
        originalName: req.file.originalname,
        size: req.file.size,
        uploadId,
      },
    });

    // Clean up temp file only if successfully uploaded to S3
    if (fileUrl.startsWith('http')) {
      await fs.unlink(req.file.path).catch(() => { });
    }

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      uploadId,
      url: fileUrl,
      localPath: req.file.path,
      filename: req.file.originalname,
      size: req.file.size,
      uploadedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (req.file) {
      fs.unlink(req.file.path).catch(() => { });
    }
    next(error);
  }
});

// Upload music/audio
router.post('/audio', upload.single('audio'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new ApiError('No file uploaded', 400, 'NO_FILE');
    }

    const allowedAudioMimes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac'];
    if (!allowedAudioMimes.includes(req.file.mimetype)) {
      await fs.unlink(req.file.path);
      throw new ApiError('Invalid audio format', 400, 'INVALID_FILE_TYPE');
    }

    const uploadId = `upload_${Date.now()}`;
    const s3Key = `audio/${uploadId}/${req.file.filename}`;

    let fileUrl: string;
    try {
      fileUrl = await uploadToS3(req.file.path, {
        bucket: process.env.S3_UPLOAD_BUCKET || 'v-ad-uploads',
        key: s3Key,
        contentType: req.file.mimetype,
      });
      await fs.unlink(req.file.path).catch(() => { });
    } catch {
      fileUrl = `/uploads/${req.file.filename}`;
    }

    res.json({
      success: true,
      message: 'Audio uploaded successfully',
      uploadId,
      url: fileUrl,
      filename: req.file.originalname,
      size: req.file.size,
      uploadedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (req.file) {
      fs.unlink(req.file.path).catch(() => { });
    }
    next(error);
  }
});

export default router;
