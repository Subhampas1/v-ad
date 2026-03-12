import fs from "fs/promises";
import fsSync from "fs";
import { generateScript, ScriptGenerationInput } from "./scriptGenerator.js";
import { prepareImageForReplaceBackground } from "./imageProcessing.js";
import { createTextOverlay } from "./textOverlay.js";
import { renderCinematicAd } from "./videoRenderer.js";
import { replaceBackground } from "./clipdropEditor.js";
import { generateVoice } from "./generateVoice.js";
import { mergeAudio } from "./finalVideo.js";
import path from "path";
import { logger } from "../utils/logger.js";
import fetch from "node-fetch";

export interface AdGenerationResult {
    script: any;
    sceneVisuals: {
        sceneNumber: number;
        imageUrl: string;
        videoUrl: string;
    }[];
    finalVideoUrl: string;
}

export const generateAd = async (
    input: ScriptGenerationInput,
    jobId: string,
    uploadFrameToS3: (b64: string, key: string) => Promise<string>,
    uploadVideoToS3: (localPath: string, key: string) => Promise<string>,
    existingScript?: any,
    rawImagePath?: string
): Promise<AdGenerationResult> => {

    logger.info(`Starting Hackathon AI Ad Generation Pipeline for job ${jobId}`);

    // 1. Generate or Use Existing Script
    const script = existingScript || await generateScript(input);

    const tempDir = path.join(process.env.VIDEO_OUTPUT_DIR || "./videos", jobId);
    await fs.mkdir(tempDir, { recursive: true });

    // Download/copy original image
    const localProductImagePath = path.join(tempDir, "product_raw.png");
    if (rawImagePath && fsSync.existsSync(rawImagePath)) {
        await fs.copyFile(rawImagePath, localProductImagePath);
    } else if (input.imageUrl) {
        logger.info(`Downloading product image from URL: ${input.imageUrl}`);
        const res = await fetch(input.imageUrl);
        const buffer = await res.arrayBuffer();
        await fs.writeFile(localProductImagePath, Buffer.from(buffer));
    } else {
        throw new Error("No image source provided for ad generator.");
    }

    // Pipeline Asset Paths
    const productClean = path.join(tempDir, "product_clean.png");
    const productShadow = path.join(tempDir, "product_shadow.png");
    const textBrandPath = path.join(tempDir, "text_brand.png");
    const textHookPath = path.join(tempDir, "text_hook.png");
    const textCTAPath = path.join(tempDir, "text_cta.png");
    const videoOutput = path.join(tempDir, "ad_base.mp4");

    // --- NEW PIPELINE EXECUTION - INTEGRATED BACKGROUND ---

    const productPadded = path.join(tempDir, "product_padded.png");

    // Step 1: Prepare product on 1080x1920 canvas
    await prepareImageForReplaceBackground(localProductImagePath, productPadded);

    // Step 2: Dynamic Integrated Background Generation via ClipDrop
    const background = path.join(tempDir, "generated_bg.jpg");
    // We strictly enforce product photography aesthetics even if the AI prompt is loose
    const aiPrompt = `${script.background || 'luxury product photography background'}, professional commercial product photography studio background, soft cinematic lighting, 8k resolution`;

    logger.info(`Generating completely integrated dynamic AI ad photo with prompt: "${aiPrompt}"`);
    try {
        await replaceBackground(productPadded, background, aiPrompt);
    } catch (err) {
        logger.error("Dynamic integrated background generation failed.");
        throw new Error("Failed to generate integrated ad frame from Clipdrop.");
    }

    // Step 2: Generate Marketing Text Layers
    const brandName = input.productName || input.businessType || "Premium Brand";
    const hook = script.scenes?.[0]?.voiceoverText || "NEW COLLECTION";
    const cta = script.callToAction || "SHOP NOW";

    await createTextOverlay(textBrandPath, {
        text: brandName,
        width: 1080,
        height: 160,
        fontSize: 90,
        fontColor: "#FFFFFF"
    });

    await createTextOverlay(textHookPath, {
        text: hook,
        width: 1080,
        height: 150,
        fontSize: 50,
        fontColor: "#FFFFFF"
    });

    await createTextOverlay(textCTAPath, {
        text: cta,
        width: 600,
        height: 160,
        fontSize: 60,
        fontColor: "#FFFFFF",
        isCTA: true
    });

    // We can upload the clean product as a preview or composite a static frame for the UI
    // Here we'll just upload the perfectly blended background frame for simplicity
    const rawImageBuffer = await fs.readFile(background);
    const imageKey = `frames/${jobId}/scene-1.png`;
    const imageUrl = await uploadFrameToS3(rawImageBuffer.toString('base64'), imageKey);

    // Step 3: Render Cinematic Multi-Layer Video
    await renderCinematicAd({
        bg: background,
        textBrand: textBrandPath,
        textHook: textHookPath,
        textCTA: textCTAPath
    }, videoOutput);

    // Step 4: Generate Voiceover and merge
    const fullVoiceText = script.scenes?.map((s: any) => s.voiceoverText).join(" ") + " " + cta;
    const voicePath = path.join(tempDir, "voice.mp3");
    await generateVoice(fullVoiceText, voicePath);

    const finalLocalVideoPath = path.join(process.env.VIDEO_OUTPUT_DIR || "./videos", `${jobId}.mp4`);
    await mergeAudio(videoOutput, voicePath, finalLocalVideoPath);

    // Upload Final Video to S3
    const finalKey = `videos/${jobId}/final.mp4`;
    const finalVideoUrl = await uploadVideoToS3(finalLocalVideoPath, finalKey);

    return {
        script,
        sceneVisuals: [{
            sceneNumber: 1,
            imageUrl,
            videoUrl: finalVideoUrl
        }],
        finalVideoUrl
    };
};

