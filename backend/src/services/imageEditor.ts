import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { logger } from '../utils/logger.js';
import type { ImageAnalysis } from './imageAnalyzer.js';

export interface AdFrameInput {
    imageAnalysis: ImageAnalysis;
    hook: string;          // Ad headline from generated script
    productName: string;
    businessType: string;
    platform: 'reels' | 'youtube' | 'whatsapp';
    adStyle?: string;
}

export interface AdFrameResult {
    base64: string;        // PNG base64 — 1280×720, ready for Nova Reel
    prompt: string;        // the prompt used for transparency
}

const getBedrockClient = () =>
    new BedrockRuntimeClient({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
    });

/**
 * Generate a professional 1280×720 advertising frame using
 * Amazon Titan Image Generator v2. The result satisfies Nova Reel's
 * exact image conditioning requirement.
 */
export async function generateAdFrame(input: AdFrameInput): Promise<AdFrameResult> {
    const client = getBedrockClient();
    const modelId = 'amazon.titan-image-generator-v2:0';

    const { imageAnalysis, hook, productName, businessType, adStyle } = input;
    const style = adStyle || imageAnalysis.suggestedAdStyle || 'Professional';
    const colors = imageAnalysis.dominantColors.join(', ') || 'brand colors';

    // Craft a detailed ad-photography prompt
    const adPrompt = [
        `Professional advertising photograph, 16:9 landscape format`,
        `Subject: ${imageAnalysis.productDescription}`,
        `Product name: ${productName}, Category: ${imageAnalysis.category}`,
        `Business: ${businessType}`,
        `Visual style: ${style}`,
        `Color palette: ${colors}`,
        `Key elements: ${imageAnalysis.keyVisualElements.slice(0, 4).join(', ')}`,
        `Ad headline context: "${hook}"`,
        `Clean professional studio background, product hero shot, sharp focus`,
        `High-end commercial photography, dramatic lighting, advertisement quality`,
        `No text overlays, no watermarks, photorealistic`,
    ].join('. ');

    const negativePrompt =
        'blurry, low quality, watermark, text overlay, logo, cluttered background, amateur, cartoon, illustration';

    logger.info(`Generating 1280×720 ad frame with Titan Image Generator v2`);
    logger.info(`Ad prompt: ${adPrompt.slice(0, 120)}...`);

    const payload = {
        taskType: 'TEXT_IMAGE',
        textToImageParams: {
            text: adPrompt,
            negativeText: negativePrompt,
        },
        imageGenerationConfig: {
            numberOfImages: 1,
            height: 720,
            width: 1280,
            cfgScale: 8.0,
            seed: Math.floor(Math.random() * 2147483648),
        },
    };

    const command = new InvokeModelCommand({
        modelId,
        body: JSON.stringify(payload),
        contentType: 'application/json',
        accept: 'application/json',
    });

    const response = await client.send(command);
    const body = JSON.parse(new TextDecoder().decode(response.body));

    if (body.error) {
        throw new Error(`Titan Image Generator error: ${body.error}`);
    }

    const base64Image: string = body.images?.[0];
    if (!base64Image) {
        throw new Error('Titan Image Generator returned no image');
    }

    logger.info('✅ Ad frame generated at 1280×720');
    return { base64: base64Image, prompt: adPrompt };
}
