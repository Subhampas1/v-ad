import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic as any);
}

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { logger } from '../utils/logger.js';
import {
  BedrockRuntimeClient,
  StartAsyncInvokeCommand,
  GetAsyncInvokeCommand
} from '@aws-sdk/client-bedrock-runtime';
import { S3Client, GetObjectCommand, ListObjectsV2Command, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface VideoGenerationInput {
  scriptPath?: string;
  imagePath: string;
  outputPath: string;
  platform: 'reels' | 'youtube' | 'whatsapp';
  musicPath?: string;
  watermarkText?: string;
  prompt?: string;
  businessType?: string;
  productName?: string;
}

export interface VideoResolution {
  platform: 'reels' | 'youtube' | 'whatsapp';
  width: number;
  height: number;
  fps: number;
  bitrate: string;
}

export const PLATFORM_RESOLUTIONS: Record<string, VideoResolution> = {
  reels: { platform: 'reels', width: 1080, height: 1920, fps: 30, bitrate: '5000k' },
  youtube: { platform: 'youtube', width: 1920, height: 1080, fps: 30, bitrate: '8000k' },
  whatsapp: { platform: 'whatsapp', width: 720, height: 1280, fps: 24, bitrate: '2000k' },
};

// Nova Reel AI Video Generation input
export interface NovaReelVideoInput {
  prompt: string;
  imageBase64?: string;
  imagePath?: string;
  outputPath: string;
  platform: 'reels' | 'youtube' | 'whatsapp';
  // FFmpeg overlay text (Step 4)
  overlayHook?: string;
  overlayProductName?: string;
  overlayCta?: string;
}

// Helper to get Bedrock client — defined BEFORE use
const getBedrockClient = () => {
  return new BedrockRuntimeClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
};

// Helper to get S3 client
const getS3Client = () => {
  return new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
};

// Detect image format from URL extension
const detectImageFormat = (imagePath: string): 'jpeg' | 'png' | 'gif' | 'webp' => {
  const ext = imagePath.split('?')[0].split('.').pop()?.toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') return 'jpeg';
  if (ext === 'png') return 'png';
  if (ext === 'gif') return 'gif';
  if (ext === 'webp') return 'jpeg'; // Nova Reel does not support webp — treat as jpeg
  return 'jpeg'; // safe default
};

export const generateVideoWithNovaReel = async (
  input: NovaReelVideoInput
): Promise<string> => {
  // MOCK MODE: return a demo video URL without hitting AWS
  if (process.env.VIDEO_MOCK === 'true') {
    logger.info('VIDEO_MOCK=true — skipping Nova Reel, returning demo URL');
    await new Promise((r) => setTimeout(r, 2000)); // simulate delay
    return 'https://www.w3schools.com/html/mov_bbb.mp4';
  }

  try {
    logger.info('Generating video using Amazon Nova Reel');

    // Nova Reel v1:0 only supports 1280x720 (16:9). 768x1280 is NOT a valid enum value.
    const dimensionMap: Record<string, string> = {
      reels: '1280x720',
      youtube: '1280x720',
      whatsapp: '1280x720',
    };

    const client = getBedrockClient();
    const modelId = process.env.VIDEO_MODEL_ID || 'amazon.nova-reel-v1:0';
    const bucket = process.env.S3_VIDEO_BUCKET || 'v-ad-videos';
    const jobKey = `videos/${Date.now()}`;
    // Nova Reel requires the S3 URI to end with '/' to denote a directory prefix
    const s3Uri = `s3://${bucket}/${jobKey}/`;

    // Build the correct Nova Reel payload
    const modelInput: Record<string, any> = {
      taskType: 'TEXT_VIDEO',
      textToVideoParams: {
        text: input.prompt,
      },
      videoGenerationConfig: {
        durationSeconds: 6,
        fps: 24,
        dimension: dimensionMap[input.platform],
        seed: Math.floor(Math.random() * 2147483648),
      },
    };

    // ── Image conditioning DISABLED ──────────────────────────────────────────
    // Even Titan-generated 1280×720 PNG frames cause Nova Reel to fail its
    // internal content / encoding validation, resulting in a manifest.json-only
    // output with no video. Text-to-video with the rich script prompt produces
    // reliable, playable video. The Titan frame is used as a preview thumbnail.
    logger.info('Nova Reel: text-to-video mode (image conditioning disabled for reliability)');


    const startCommand = new StartAsyncInvokeCommand({
      modelId,
      modelInput,
      outputDataConfig: {
        s3OutputDataConfig: {
          s3Uri,
        },
      },
    });

    const startResponse = await client.send(startCommand);
    const invocationArn = startResponse.invocationArn;

    if (!invocationArn) {
      throw new Error('Nova Reel job failed to start — no invocationArn returned');
    }

    logger.info(`Nova Reel job started: ${invocationArn}`);

    // Poll until completion (max ~10 minutes)
    let status = 'IN_PROGRESS';
    let attempts = 0;
    const maxAttempts = 120; // 120 × 5s = 10 min

    while (status === 'IN_PROGRESS' && attempts < maxAttempts) {
      await new Promise((r) => setTimeout(r, 5000));
      attempts++;

      const getCommand = new GetAsyncInvokeCommand({ invocationArn });
      const getResponse = await client.send(getCommand);
      status = (getResponse.status as string) || 'IN_PROGRESS';

      logger.info(`Nova Reel status [attempt ${attempts}]: ${status}`);

      if (status === 'Failed' || status === 'FAILED') {
        const failureMsg = (getResponse as any).failureMessage || 'Unknown failure';
        throw new Error(`Nova Reel video generation failed: ${failureMsg}`);
      }

      if (status === 'Completed' || status === 'COMPLETED') {
        break;
      }
    }

    if (attempts >= maxAttempts) {
      throw new Error('Nova Reel video generation timed out after 10 minutes');
    }

    // ── Find actual output file ─────────────────────────────────────────────
    // Nova Reel writes output.mp4 into a subdirectory under the prefix:
    //   s3://{bucket}/{jobKey}/{invocationId}/output.mp4
    // We scan the prefix with ListObjectsV2 to find the actual key.
    const s3 = getS3Client();
    logger.info(`Scanning S3 prefix for output: ${jobKey}/`);

    // Nova Reel writes manifest.json first, then output.mp4 a few seconds later.
    // Retry scan up to 15 times (10s apart) to handle this delayed S3 flush.
    const MAX_SCAN_RETRIES = 15;
    let videoObject: { Key?: string; Size?: number } | undefined;
    let lastObjects: { Key?: string; Size?: number }[] = [];

    for (let retry = 0; retry < MAX_SCAN_RETRIES; retry++) {
      if (retry > 0) {
        logger.info(`S3 scan retry ${retry}/${MAX_SCAN_RETRIES - 1} — waiting 10s for output.mp4...`);
        await new Promise((r) => setTimeout(r, 10000));
      }

      const listResp = await s3.send(new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: `${jobKey}/`,
      }));
      lastObjects = listResp.Contents || [];
      logger.info(`Scan ${retry + 1}: ${lastObjects.map((o) => `${o.Key}(${o.Size}b)`).join(', ') || 'empty'}`);

      videoObject = lastObjects.find(
        (o) => o.Key?.endsWith('output.mp4') && (o.Size ?? 0) > 0
      );
      if (videoObject?.Key) {
        logger.info(`✅ output.mp4 found after ${retry + 1} scan(s)`);
        break;
      }
    }

    if (!videoObject?.Key) {
      // Read manifest.json for diagnostic info
      const manifestObj = lastObjects.find((o) => o.Key?.endsWith('manifest.json'));
      let manifestInfo = '';
      if (manifestObj?.Key) {
        try {
          const manifestResp = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: manifestObj.Key }));
          const chunks: Uint8Array[] = [];
          for await (const chunk of manifestResp.Body as any) chunks.push(chunk);
          manifestInfo = Buffer.concat(chunks).toString('utf-8');
          logger.error(`Nova Reel manifest.json: ${manifestInfo}`);
        } catch { /* ignore */ }
      }
      throw new Error(
        `Nova Reel completed but no video after ${MAX_SCAN_RETRIES} scans. ` +
        `manifest: ${manifestInfo || 'none'}`
      );
    }


    const videoKey = videoObject.Key;
    logger.info(`✅ Video output found at: s3://${bucket}/${videoKey}`);

    // Since bucket is public, return a direct HTTPS URL
    const region = process.env.AWS_REGION || 'us-east-1';
    const videoHttpUrl = `https://${bucket}.s3.${region}.amazonaws.com/${videoKey}`;

    logger.info(`✅ Nova Reel video ready: ${videoHttpUrl}`);
    return videoHttpUrl;

  } catch (error) {
    logger.error({ err: error }, 'Nova Reel video generation failed');
    throw error;
  }
};

// ── Step 4+5: FFmpeg text overlays + S3 final upload ─────────────────────────
export interface OverlayInput {
  rawVideoUrl: string;   // Public S3 URL of Nova Reel output
  hook: string;
  productName: string;
  cta: string;
  jobId: string;
}

export const addTextOverlaysAndUpload = async (input: OverlayInput): Promise<string> => {
  const { rawVideoUrl, hook, productName, cta, jobId } = input;
  const bucket = process.env.S3_VIDEO_BUCKET || 'v-ad-videos';
  const region = process.env.AWS_REGION || 'us-east-1';
  const tmpInput = path.join(os.tmpdir(), `raw_${jobId}.mp4`);
  const tmpOutput = path.join(os.tmpdir(), `final_${jobId}.mp4`);

  // ── 4a: Download raw video from S3 to /tmp/ ─────────────────────────────
  logger.info(`Step 4: Downloading raw video for FFmpeg overlay...`);
  const s3 = getS3Client();
  const rawKey = rawVideoUrl.replace(`https://${bucket}.s3.${region}.amazonaws.com/`, '');
  const getResp = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: rawKey }));
  if (!getResp.Body) throw new Error('No body in S3 response');
  const fileBytes = await getResp.Body.transformToByteArray();
  await fs.writeFile(tmpInput, fileBytes);
  logger.info(`Raw video downloaded to ${tmpInput}`);

  // ── 4b: Apply FFmpeg text overlays ──────────────────────────────────────
  logger.info('Step 4: Applying FFmpeg text overlays (hook / product / CTA)...');

  // Escape special FFmpeg drawtext characters
  const esc = (t: string) =>
    t.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/:/g, '\\:');

  const hookText = esc(hook.slice(0, 80));
  const productText = esc(productName.slice(0, 40));
  const ctaText = esc(cta.slice(0, 40));

  const filterComplex = [
    // Hook — top center, large bold white with dark backdrop
    `drawtext=text='${hookText}':fontsize=38:fontcolor=white:x=(w-text_w)/2:y=50` +
    `:box=1:boxcolor=black@0.55:boxborderw=12:line_spacing=4`,
    // Product name — bottom left
    `drawtext=text='${productText}':fontsize=22:fontcolor=white:x=36:y=h-68` +
    `:box=1:boxcolor=black@0.45:boxborderw=8`,
    // CTA — bottom right
    `drawtext=text='${ctaText}':fontsize=22:fontcolor=white:x=w-text_w-36:y=h-68` +
    `:box=1:boxcolor=black@0.45:boxborderw=8`,
  ].join(',');

  await new Promise<void>((resolve, reject) => {
    ffmpeg(tmpInput)
      .videoFilter(filterComplex)
      .videoCodec('libx264')
      .audioCodec('copy')
      .outputOptions(['-preset fast', '-crf 23', '-movflags +faststart'])
      .output(tmpOutput)
      .on('start', (cmd: string) => logger.info(`FFmpeg command: ${cmd.slice(0, 120)}...`))
      .on('end', () => { logger.info('✅ FFmpeg overlay complete'); resolve(); })
      .on('error', (err: Error) => { logger.error({ err }, 'FFmpeg overlay failed'); reject(err); })
      .run();
  });

  // ── 5: Upload final video to S3 ─────────────────────────────────────────
  logger.info('Step 5: Uploading final video to S3...');
  const finalKey = `videos/final/${jobId}.mp4`;
  const finalBuffer = await fs.readFile(tmpOutput);

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: finalKey,
    Body: finalBuffer,
    ContentType: 'video/mp4',
    ContentDisposition: 'inline',
  }));

  const finalUrl = `https://${bucket}.s3.${region}.amazonaws.com/${finalKey}`;
  logger.info(`✅ Final video uploaded: ${finalUrl}`);

  // Clean up tmp files
  await Promise.allSettled([fs.unlink(tmpInput), fs.unlink(tmpOutput)]);

  return finalUrl;
};



export const compressVideo = async (
  inputPath: string,
  outputPath: string,
  quality: 'high' | 'medium' | 'low' = 'medium'
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const bitrateMap = { high: '5000k', medium: '2000k', low: '800k' };

      logger.info(`Compressing video with ${quality} quality`);

      ffmpeg(inputPath)
        .videoCodec('libx264')
        .videoBitrate(bitrateMap[quality])
        .preset('medium')
        .output(outputPath)
        .on('end', () => {
          logger.info(`✅ Video compressed: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (err: Error) => {
          logger.error(`❌ Compression error: ${err.message}`);
          reject(new Error(`Compression failed: ${err.message}`));
        })
        .run();
    } catch (error) {
      logger.error('Compression setup error:', error);
      reject(error);
    }
  });
};

export const getVideoMetadata = async (videoPath: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err: Error | null, data: any) => {
      if (err) {
        logger.error('Metadata extraction error:', err);
        reject(err);
      } else {
        logger.info('Video metadata extracted');
        resolve(data);
      }
    });
  });
};

// Helper to convert image file to base64
export const imageToBase64 = async (imagePath: string): Promise<string> => {
  const buffer = await fs.readFile(imagePath);
  return buffer.toString('base64');
};
