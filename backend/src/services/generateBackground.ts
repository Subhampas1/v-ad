import fetch from "node-fetch";
import { logger } from "../utils/logger.js";

export async function generateBackground(prompt?: string): Promise<Buffer> {
    const basePrompt = prompt || "luxury product photography background, soft studio lighting";
    // We strictly enforce product photography aesthetics even if the AI prompt is loose
    const finalPrompt = `${basePrompt}, professional commercial product photography studio background, empty podium, soft cinematic lighting, 8k resolution`;
    logger.info(`Generating advertisement background via ClipDrop with prompt: "${finalPrompt}"`);

    const response = await fetch("https://clipdrop-api.co/text-to-image/v1", {
        method: "POST",
        headers: {
            "x-api-key": process.env.CLIPDROP_API_KEY || "",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            prompt: finalPrompt
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        logger.error(`ClipDrop text-to-image failed: ${response.status} ${response.statusText}`, { errorText });
        throw new Error(`ClipDrop API error: ${response.status} - ${errorText}`);
    }

    const buffer = await response.arrayBuffer();
    logger.info("Successfully generated background image.");
    return Buffer.from(buffer);
}
