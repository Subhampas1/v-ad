import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { logger } from '../utils/logger.js';

export interface ImageAnalysis {
    productDescription: string;
    category: string;
    keyVisualElements: string[];
    dominantColors: string[];
    suggestedAdStyle: string;
    rawDescription: string;
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
 * Analyze a product image using Nova Lite multimodal vision.
 * Returns structured product details to ground script generation.
 */
export async function analyzeProductImage(
    imageBase64: string,
    imageFormat: 'jpeg' | 'png' | 'webp' = 'jpeg'
): Promise<ImageAnalysis> {
    const client = getBedrockClient();
    const modelId = process.env.BEDROCK_MODEL_ID || 'amazon.nova-lite-v1:0';

    const systemPrompt = `You are a professional product analyst for an advertising agency.
Analyze the product image and return a JSON object with these exact fields:
{
  "productDescription": "concise 1-2 sentence description of what the product is",
  "category": "product category (e.g. Electronics, Food, Fashion, Beauty, Home, Automotive)",
  "keyVisualElements": ["list", "of", "key", "visual", "features"],
  "dominantColors": ["primary color", "secondary color"],
  "suggestedAdStyle": "suggested visual style for the ad (e.g. Minimalist, Vibrant, Luxury, Playful, Professional)"
}
Return ONLY valid JSON, no markdown, no explanation.`;

    const userMessage = {
        role: 'user',
        content: [
            {
                image: {
                    format: imageFormat === 'webp' ? 'jpeg' : imageFormat,
                    source: { bytes: imageBase64 },
                },
            },
            {
                text: 'Analyze this product image and return the JSON analysis.',
            },
        ],
    };

    const payload = {
        messages: [userMessage],
        system: [{ text: systemPrompt }],
        inferenceConfig: { maxTokens: 512, temperature: 0.2 },
    };

    logger.info(`Analyzing product image with ${modelId}`);

    const command = new InvokeModelCommand({
        modelId,
        body: JSON.stringify(payload),
        contentType: 'application/json',
        accept: 'application/json',
    });

    const response = await client.send(command);
    const body = JSON.parse(new TextDecoder().decode(response.body));
    const text: string = body.output?.message?.content?.[0]?.text || '';

    logger.info('Image analysis complete');

    try {
        // Extract JSON from response (handle possible markdown wrapping)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON in analysis response');
        const parsed = JSON.parse(jsonMatch[0]);
        return {
            productDescription: parsed.productDescription || 'A product',
            category: parsed.category || 'General',
            keyVisualElements: parsed.keyVisualElements || [],
            dominantColors: parsed.dominantColors || [],
            suggestedAdStyle: parsed.suggestedAdStyle || 'Professional',
            rawDescription: text,
        };
    } catch {
        logger.warn('Could not parse image analysis JSON, using raw text');
        return {
            productDescription: text.slice(0, 200),
            category: 'General',
            keyVisualElements: [],
            dominantColors: [],
            suggestedAdStyle: 'Professional',
            rawDescription: text,
        };
    }
}
