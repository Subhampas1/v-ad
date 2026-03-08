import express, { Request, Response, NextFunction } from 'express';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { generateVideoWithNovaReel, addTextOverlaysAndUpload } from '../../services/videoGenerator.js';
import { generateAdFrames, NovaCanvasResult } from '../../services/novaCanvas.js';
import { analyzeProductImage, ImageAnalysis } from '../../services/imageAnalyzer.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { logger } from '../../utils/logger.js';
import { addHistoryItem } from './history.js';
import path from 'path';

const router = express.Router();

interface GenerateVideoRequest {
  prompt?: string;
  scriptId?: string;
  imagePath?: string;       // S3 URL of uploaded product image
  imageBase64?: string;
  platform: 'reels' | 'youtube' | 'whatsapp';
  businessType?: string;
  productName?: string;
  hook?: string;            // Script hook line (for FFmpeg overlay)
  cta?: string;             // Script CTA line  (for FFmpeg overlay)
  imageAnalysis?: ImageAnalysis;
}

const getS3Client = () => new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Helper: fetch image from URL → base64
async function fetchImage(url: string): Promise<{ base64: string; format: 'jpeg' | 'png' }> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Image fetch failed: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const ct = response.headers.get('content-type') || '';
  return { base64: buffer.toString('base64'), format: ct.includes('png') ? 'png' : 'jpeg' };
}

// Helper: upload a base64 PNG to S3, return public URL
async function uploadFrameToS3(
  base64: string,
  key: string
): Promise<string> {
  const bucket = process.env.S3_VIDEO_BUCKET || 'v-ad-videos';
  const region = process.env.AWS_REGION || 'us-east-1';
  const s3 = getS3Client();
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: Buffer.from(base64, 'base64'),
    ContentType: 'image/png',
  }));
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

// ── POST /api/video/generate ─────────────────────────────────────────────────
// Full 5-step pipeline:
//   1. Nova Canvas: background removal + 4 ad frame variations
//   2. Save frames to S3
//   3. Nova Reel: text-to-video using script prompt
//   4. FFmpeg: add hook/product/CTA text overlays
//   5. Upload final video to S3, return URL
router.post('/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = req.body as GenerateVideoRequest;

    if (!input.platform) throw new ApiError('platform is required', 400, 'VALIDATION_ERROR');
    if (!['reels', 'youtube', 'whatsapp'].includes(input.platform))
      throw new ApiError('Invalid platform', 400, 'INVALID_PLATFORM');

    const jobId = `job_${Date.now()}`;
    const outputPath = path.join(process.env.VIDEO_OUTPUT_DIR || './videos', `${jobId}.mp4`);
    const productName = input.productName || 'Product';
    const businessType = input.businessType || 'Business';
    const hook = input.hook || input.prompt?.split('.')[0] || productName;
    const cta = input.cta || 'Shop Now';

    // ── Step 1: Fetch product image ───────────────────────────────────────────
    let productImageBase64: string | undefined = input.imageBase64;
    let imageFormat: 'jpeg' | 'png' = 'jpeg';

    if (!productImageBase64 && input.imagePath) {
      try {
        logger.info(`Fetching product image: ${input.imagePath}`);
        const fetched = await fetchImage(input.imagePath);
        productImageBase64 = fetched.base64;
        imageFormat = fetched.format;
      } catch (err) {
        logger.warn({ err }, 'Could not fetch product image');
      }
    }

    // ── Analyze image (reuse or compute) ─────────────────────────────────────
    let imageAnalysis: ImageAnalysis | null = (input.imageAnalysis as ImageAnalysis) || null;
    if (!imageAnalysis && productImageBase64) {
      try {
        imageAnalysis = await analyzeProductImage(productImageBase64, imageFormat);
        logger.info(`Image analysis: "${imageAnalysis.productDescription}"`);
      } catch (err) {
        logger.warn({ err }, 'Image analysis failed');
      }
    }

    // ── Step 1+2: Nova Canvas — generate 4 ad frames ─────────────────────────
    logger.info('━━ Step 1: Nova Canvas — generating ad frames...');
    let canvasResult: NovaCanvasResult | null = null;
    const adFrameUrls: string[] = [];

    if (productImageBase64 && imageAnalysis) {
      try {
        canvasResult = await generateAdFrames(
          productImageBase64,
          imageAnalysis,
          hook,
          productName,
          businessType
        );

        // ── Step 2: Upload all frames to S3 ──────────────────────────────────
        logger.info(`━━ Step 2: Uploading ${canvasResult.frames.length} ad frames to S3...`);
        for (const frame of canvasResult.frames) {
          try {
            const frameKey = `frames/${jobId}/frame-${frame.index + 1}.png`;
            const frameUrl = await uploadFrameToS3(frame.base64, frameKey);
            adFrameUrls.push(frameUrl);
            logger.info(`  ✅ Frame ${frame.index + 1} (${frame.scene}): ${frameUrl}`);
          } catch (err) {
            logger.warn({ err }, `Failed to upload frame ${frame.index + 1}`);
          }
        }
      } catch (err) {
        logger.warn({ err }, 'Nova Canvas failed — continuing without ad frames');
      }
    } else {
      logger.info('Skipping Nova Canvas (no product image or analysis available)');
    }

    // ── Step 3: Nova Reel — text-to-video ────────────────────────────────────
    logger.info('━━ Step 3: Nova Reel — generating video...');
    const videoPrompt = input.prompt ||
      `${businessType} advertisement for ${productName}. ${hook}. ` +
      (imageAnalysis
        ? `Product: ${imageAnalysis.productDescription}. Style: ${imageAnalysis.suggestedAdStyle}.`
        : '') +
      ` ${cta}. Professional, cinematic, high quality.`;

    const rawVideoUrl = await generateVideoWithNovaReel({
      prompt: videoPrompt,
      outputPath,
      platform: input.platform,
    });

    // ── Step 4+5: FFmpeg overlays + S3 final upload ───────────────────────────
    logger.info('━━ Step 4: FFmpeg — adding text overlays...');
    let finalVideoUrl = rawVideoUrl;
    try {
      finalVideoUrl = await addTextOverlaysAndUpload({
        rawVideoUrl,
        hook,
        productName,
        cta,
        jobId,
      });
    } catch (err) {
      logger.warn({ err }, 'FFmpeg overlay failed — returning raw video URL');
      finalVideoUrl = rawVideoUrl;
    }

    logger.info(`━━ ✅ Pipeline complete. Final video: ${finalVideoUrl}`);

    // Record in history
    addHistoryItem({
      type: 'video',
      url: finalVideoUrl,
      metadata: {
        platform: input.platform,
        businessType,
        productName,
        adFrameCount: adFrameUrls.length,
        prompt: videoPrompt.substring(0, 100),
      },
    });

    res.json({
      success: true,
      message: 'Ad video generated successfully',
      videoUrl: finalVideoUrl,
      rawVideoUrl,
      adFrameUrls,                        // 4 Nova Canvas frames
      adFrameCount: adFrameUrls.length,
      imageAnalysis: imageAnalysis || undefined,
      platform: input.platform,
    });
  } catch (error) {
    next(error);
  }
});

// Get video formats info
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
