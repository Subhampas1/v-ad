import express, { Request, Response, NextFunction } from 'express';
import { generateScript, ScriptGenerationInput, validateScriptStructure } from '../../services/scriptGenerator.js';
import { analyzeProductImage, ImageAnalysis } from '../../services/imageAnalyzer.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { logger } from '../../utils/logger.js';
import { addHistoryItem } from './history.js';

const router = express.Router();

interface GenerateScriptRequest {
  businessType: string;
  productName: string;
  language: 'en' | 'hi' | 'te' | 'ta' | 'kn' | 'ml';
  platform: 'reels' | 'youtube' | 'whatsapp';
  tone?: 'professional' | 'casual' | 'humorous' | 'emotional';
  duration?: 15 | 30 | 60;
  imageUrl?: string;    // S3 URL of product image for Nova Lite vision analysis
  imageBase64?: string; // Alternative: raw base64
}

// Helper: fetch image from URL and return base64
async function fetchImageAsBase64(url: string): Promise<{ base64: string; format: 'jpeg' | 'png' }> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') || '';
  const format = contentType.includes('png') ? 'png' : 'jpeg';
  return { base64: buffer.toString('base64'), format };
}

// ── POST /api/script/generate ─────────────────────────────────────────────────
// Pipeline: fetch image → analyze → generate script grounded in image analysis
router.post('/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = req.body as GenerateScriptRequest;

    const requiredFields = ['businessType', 'productName', 'language', 'platform'];
    const missing = requiredFields.filter((f) => !input[f as keyof GenerateScriptRequest]);
    if (missing.length > 0) {
      throw new ApiError(`Missing required fields: ${missing.join(', ')}`, 400, 'VALIDATION_ERROR');
    }

    if (!['en', 'hi', 'te', 'ta', 'kn', 'ml'].includes(input.language))
      throw new ApiError('Invalid language', 400, 'INVALID_LANGUAGE');
    if (!['reels', 'youtube', 'whatsapp'].includes(input.platform))
      throw new ApiError('Invalid platform', 400, 'INVALID_PLATFORM');
    if (input.tone && !['professional', 'casual', 'humorous', 'emotional'].includes(input.tone))
      throw new ApiError('Invalid tone', 400, 'INVALID_TONE');

    // ── Step 1: Fetch & analyze the product image ─────────────────────────────
    let imageAnalysis: ImageAnalysis | null = null;
    let imageBase64 = input.imageBase64;
    let imageFormat: 'jpeg' | 'png' = 'jpeg';

    if (!imageBase64 && input.imageUrl) {
      try {
        logger.info(`Fetching product image for vision analysis: ${input.imageUrl}`);
        const fetched = await fetchImageAsBase64(input.imageUrl);
        imageBase64 = fetched.base64;
        imageFormat = fetched.format;
      } catch (err) {
        logger.warn({ err }, 'Could not fetch image, skipping vision analysis');
      }
    }

    if (imageBase64) {
      try {
        logger.info('Analyzing product image with Nova Lite vision...');
        imageAnalysis = await analyzeProductImage(imageBase64, imageFormat);
        logger.info(`Image analysis: "${imageAnalysis.productDescription}"`);
      } catch (err) {
        logger.warn({ err }, 'Image analysis failed, generating script without it');
      }
    }

    // ── Step 2: Generate script using image analysis as context ───────────────
    const scriptInput: ScriptGenerationInput = {
      ...(input as any),
      productContext: imageAnalysis
        ? `Product: ${imageAnalysis.productDescription}. Category: ${imageAnalysis.category}. ` +
        `Suggested ad style: ${imageAnalysis.suggestedAdStyle}. ` +
        `Key visual elements: ${imageAnalysis.keyVisualElements.join(', ')}.`
        : undefined,
    };

    logger.info('Generating script:', { businessType: input.businessType, productName: input.productName });
    const script = await generateScript(scriptInput);

    if (!validateScriptStructure(script)) {
      throw new ApiError('Generated script has invalid structure', 500, 'INVALID_SCRIPT_STRUCTURE');
    }

    const scriptId = `script_${Date.now()}`;
    logger.info('Script generated successfully');

    addHistoryItem({
      type: 'script',
      url: '',
      metadata: {
        scriptId,
        title: script.title,
        businessType: input.businessType,
        productName: input.productName,
        platform: input.platform,
        callToAction: script.callToAction,
        sceneCount: script.scenes.length,
      },
    });

    res.json({
      success: true,
      script,
      scriptId,
      imageAnalysis,   // frontend shows "What AI saw in your image"
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Get script templates
router.get('/templates', (_req: Request, res: Response) => {
  res.json({
    templates: [
      { id: 'template_1', name: 'Product Launch', description: 'Perfect for launching a new product', sceneCount: 5 },
      { id: 'template_2', name: 'Service Showcase', description: 'Ideal for service-based businesses', sceneCount: 4 },
      { id: 'template_3', name: 'Social Proof', description: 'Focus on customer testimonials', sceneCount: 6 },
      { id: 'template_4', name: 'Quick Promo', description: 'Short and punchy offer-based ad', sceneCount: 3 },
    ],
  });
});

// Get language options
router.get('/languages', (_req: Request, res: Response) => {
  res.json({
    languages: [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
      { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
      { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
      { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
      { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
    ],
  });
});

export default router;
