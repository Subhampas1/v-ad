import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { logger } from '../utils/logger.js';
import type { ImageAnalysis } from './imageAnalyzer.js';

export interface AdFrame {
    base64: string;       // PNG base64
    scene: string;        // scene description
    index: number;
}

export interface NovaCanvasResult {
    frames: AdFrame[];
    cleanProductBase64?: string;  // background-removed version
}

const getClient = () =>
    new BedrockRuntimeClient({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
    });

const MODEL = 'amazon.nova-canvas-v1:0';

// ── Invoke Nova Canvas with a given payload ───────────────────────────────────
async function invokeNovaCanvas(payload: object): Promise<string> {
    const client = getClient();
    const command = new InvokeModelCommand({
        modelId: MODEL,
        body: JSON.stringify(payload),
        contentType: 'application/json',
        accept: 'application/json',
    });
    const response = await client.send(command);
    const body = JSON.parse(new TextDecoder().decode(response.body));
    if (body.error) throw new Error(`Nova Canvas error: ${body.error}`);
    const image = body.images?.[0];
    if (!image) throw new Error('Nova Canvas returned no image');
    return image; // base64 PNG
}

// ── Step 1a: Remove product image background ──────────────────────────────────
export async function removeBackground(imageBase64: string): Promise<string> {
    logger.info('Nova Canvas: removing product image background...');
    const payload = {
        taskType: 'BACKGROUND_REMOVAL',
        backgroundRemovalParams: {
            image: imageBase64,
        },
    };
    const result = await invokeNovaCanvas(payload);
    logger.info('✅ Background removed');
    return result;
}

// ── Step 1b: Generate ad-styled image variations ──────────────────────────────
async function generateVariation(
    imageBase64: string,
    prompt: string,
    negativePrompt: string,
    similarityStrength: number = 0.6
): Promise<string> {
    const payload = {
        taskType: 'IMAGE_VARIATION',
        imageVariationParams: {
            images: [imageBase64],
            text: prompt,
            negativeText: negativePrompt,
            similarityStrength,   // 0.2 = creative, 1.0 = exact copy
        },
        imageGenerationConfig: {
            numberOfImages: 1,
            height: 720,
            width: 1280,
            cfgScale: 7.5,
            seed: Math.floor(Math.random() * 2147483648),
        },
    };
    return invokeNovaCanvas(payload);
}

// ── Step 2: Generate 4 ad frames from clean product image ─────────────────────
export async function generateAdFrames(
    productImageBase64: string,
    imageAnalysis: ImageAnalysis,
    hook: string,
    productName: string,
    businessType: string
): Promise<NovaCanvasResult> {
    const base = imageAnalysis.productDescription;
    const style = imageAnalysis.suggestedAdStyle || 'Professional';
    const colors = imageAnalysis.dominantColors.join(', ') || 'vibrant';
    const neg = 'blurry, watermark, text, logo, low quality, distorted, amateur, cartoon';

    // Scene definitions — each has a different visual concept
    const scenes: Array<{ desc: string; prompt: string; similarity: number }> = [
        {
            desc: 'Hero shot',
            prompt: `${base}, product hero shot, clean gradient background, ${colors}, professional studio photography, ${style} advertisement, cinematic lighting, ultra sharp, 16:9`,
            similarity: 0.65,
        },
        {
            desc: 'Lifestyle scene',
            prompt: `${base}, lifestyle advertisement, ${businessType} scene, natural environment, aspirational lifestyle, ${style}, warm lighting, 16:9 landscape`,
            similarity: 0.55,
        },
        {
            desc: 'Feature close-up',
            prompt: `${base}, macro close-up detail shot, premium product photography, dramatic lighting, ${colors} color theme, high-end commercial, minimalist background, 16:9`,
            similarity: 0.70,
        },
        {
            desc: 'CTA scene',
            prompt: `${base}, call-to-action advertisement scene, bold ${style} style, ${colors} brand colors, energetic professional composition, marketing photography, 16:9`,
            similarity: 0.60,
        },
    ];

    // Step 1a: remove background first for cleaner variations
    let cleanProductBase64: string | undefined;
    try {
        cleanProductBase64 = await removeBackground(productImageBase64);
    } catch (err) {
        logger.warn({ err }, 'Background removal failed, using original image for variations');
        cleanProductBase64 = productImageBase64;
    }

    // Step 1b: generate 4 variations
    const frames: AdFrame[] = [];

    for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        logger.info(`Nova Canvas: generating frame ${i + 1}/4 — ${scene.desc}`);
        try {
            const base64 = await generateVariation(
                cleanProductBase64!,
                scene.prompt,
                neg,
                scene.similarity
            );
            frames.push({ base64, scene: scene.desc, index: i });
            logger.info(`✅ Frame ${i + 1} complete`);
        } catch (err) {
            logger.warn({ err }, `Frame ${i + 1} failed, skipping`);
        }
    }

    if (frames.length === 0) {
        throw new Error('Nova Canvas: all 4 frame generations failed');
    }

    logger.info(`✅ Nova Canvas generated ${frames.length} ad frames`);
    return { frames, cleanProductBase64 };
}
