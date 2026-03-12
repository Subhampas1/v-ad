import express, { Request, Response, NextFunction } from 'express';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { generateAd } from '../../services/adGenerator.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { logger } from '../../utils/logger.js';
import { addHistoryItem } from './history.js';
import path from 'path';

const router = express.Router();

interface GenerateVideoRequest {
  platform: 'reels' | 'youtube' | 'whatsapp';
  businessType?: string;
  productName?: string;
  language?: 'en' | 'hi' | 'te' | 'ta' | 'kn' | 'ml';
  script?: any;
  hook?: string;
  cta?: string;
}

const getS3Client = () => new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Helper: upload a base64 string or file buffer to S3, return public URL
async function uploadToS3(
  source: string | Buffer,
  key: string,
  contentType: string
): Promise<string> {
  const bucket = process.env.S3_VIDEO_BUCKET || 'v-ad-videos';
  const region = process.env.AWS_REGION || 'us-east-1';
  const s3 = getS3Client();

  let body: Buffer;
  if (typeof source === 'string') {
    body = Buffer.from(source, 'base64');
  } else {
    body = source;
  }

  const filename = key.split('/').pop() || 'video.mp4';

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    ContentDisposition: `inline; filename="${filename}"`
  }));
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

import fs from 'fs/promises';

async function uploadVideoFileToS3(localPath: string, key: string): Promise<string> {
  const buffer = await fs.readFile(localPath);
  return uploadToS3(buffer, key, 'video/mp4');
}

async function uploadFrameToS3(base64: string, key: string): Promise<string> {
  return uploadToS3(base64, key, 'image/png');
}

// ── POST /api/video/generate ─────────────────────────────────────────────────
router.post('/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = req.body as GenerateVideoRequest;

    if (!input.platform) throw new ApiError('platform is required', 400, 'VALIDATION_ERROR');
    if (!['reels', 'youtube', 'whatsapp'].includes(input.platform))
      throw new ApiError('Invalid platform', 400, 'INVALID_PLATFORM');

    const jobId = `job_${Date.now()}`;
    const productName = input.productName || 'Product';
    const businessType = input.businessType || 'Business';
    const language = input.language || 'en';

    logger.info(`━━ Starting Ad Generation Pipeline (Job: ${jobId})`);

    // If the frontend sends imagePath, it's the S3 URL of the uploaded image
    const imageUrl = (input as any).imagePath;

    const result = await generateAd({
      productName,
      businessType,
      platform: input.platform,
      language,
      duration: 15,
      imageUrl // Pass the image URL down to the generator
    }, jobId, uploadFrameToS3, uploadVideoFileToS3, input.script);

    logger.info(`━━ ✅ Pipeline complete. Final video: ${result.finalVideoUrl}`);

    // Record in history
    addHistoryItem({
      type: 'video',
      url: result.finalVideoUrl,
      metadata: {
        platform: input.platform,
        businessType,
        productName,
        scriptTitle: result.script.title,
        adFrameCount: result.sceneVisuals.length
      },
    });

    res.json({
      success: true,
      message: 'Ad video generated successfully',
      script: result.script,
      sceneVisuals: result.sceneVisuals,
      videoUrl: result.finalVideoUrl,
      platform: input.platform,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/formats/available', (_req: Request, res: Response) => {
  res.json({
    formats: [
      { platform: 'reels', resolution: '1280x720', aspectRatio: '16:9', fps: 24 },
      { platform: 'youtube', resolution: '1280x720', aspectRatio: '16:9', fps: 24 },
      { platform: 'whatsapp', resolution: '1280x720', aspectRatio: '16:9', fps: 24 },
    ],
  });
});

export default router;
