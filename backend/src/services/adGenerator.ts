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
// 📌 CLEANUP: removed `node-fetch` import — Node 18+ has native fetch built-in
//    (also removes the need for the `node-fetch` package dependency)

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
    // 📌 Using native fetch (Node 18+) instead of node-fetch package
    const res = await fetch(input.imageUrl);
    const buffer = await res.arrayBuffer();
    await fs.writeFile(localProductImagePath, Buffer.from(buffer));
  } else {
    throw new Error("No image source provided for ad generator.");
  }

  // Pipeline Asset Paths
  const productPadded = path.join(tempDir, "product_padded.png");
  const textBrandPath = path.join(tempDir, "text_brand.png");
  const textHookPath  = path.join(tempDir, "text_hook.png");
  const textCTAPath   = path.join(tempDir, "text_cta.png");
  const videoOutput   = path.join(tempDir, "ad_base.mp4");
  const background    = path.join(tempDir, "generated_bg.jpg");

  // Path for the final merged video (stored outside tempDir so cleanup is safe)
  const finalLocalVideoPath = path.join(
    process.env.VIDEO_OUTPUT_DIR || "./videos",
    `${jobId}.mp4`
  );

  try {
    // Step 1: Prepare product on 1080x1920 canvas
    await prepareImageForReplaceBackground(localProductImagePath, productPadded);

    // Step 2: Dynamic Integrated Background Generation via ClipDrop
    const aiPrompt = `${script.background || "luxury product photography background"}, professional commercial product photography studio background, soft cinematic lighting, 8k resolution`;
    logger.info(`Generating dynamic AI ad photo with prompt: "${aiPrompt}"`);
    try {
      await replaceBackground(productPadded, background, aiPrompt);
    } catch (err) {
      logger.error("Dynamic integrated background generation failed.");
      throw new Error("Failed to generate integrated ad frame from Clipdrop.");
    }

    // Step 3: Generate Marketing Text Layers
    const brandName = input.productName || input.businessType || "Premium Brand";
    const hook = script.scenes?.[0]?.voiceoverText || "NEW COLLECTION";
    const cta  = script.callToAction || "SHOP NOW";

    await createTextOverlay(textBrandPath, {
      text: brandName,
      width: 1080,
      height: 160,
      fontSize: 90,
      fontColor: "#FFFFFF",
    });

    await createTextOverlay(textHookPath, {
      text: hook,
      width: 1080,
      height: 150,
      fontSize: 50,
      fontColor: "#FFFFFF",
    });

    await createTextOverlay(textCTAPath, {
      text: cta,
      width: 600,
      height: 160,
      fontSize: 60,
      fontColor: "#FFFFFF",
      isCTA: true,
    });

    // Upload the generated background as preview frame
    const rawImageBuffer = await fs.readFile(background);
    const imageKey = `frames/${jobId}/scene-1.png`;
    const imageUrl = await uploadFrameToS3(rawImageBuffer.toString("base64"), imageKey);

    // Step 4: Render Cinematic Multi-Layer Video
    await renderCinematicAd(
      {
        bg:        background,
        textBrand: textBrandPath,
        textHook:  textHookPath,
        textCTA:   textCTAPath,
      },
      videoOutput
    );

    // Step 5: Generate Voiceover and merge with video
    const fullVoiceText =
      script.scenes?.map((s: any) => s.voiceoverText).join(" ") + " " + cta;
    const voicePath = path.join(tempDir, "voice.mp3");
    await generateVoice(fullVoiceText, voicePath);
    await mergeAudio(videoOutput, voicePath, finalLocalVideoPath);

    // Step 6: Upload Final Video to S3
    const finalKey = `videos/${jobId}/final.mp4`;
    const finalVideoUrl = await uploadVideoToS3(finalLocalVideoPath, finalKey);

    return {
      script,
      sceneVisuals: [{ sceneNumber: 1, imageUrl, videoUrl: finalVideoUrl }],
      finalVideoUrl,
    };
  } finally {
    // 📌 DISK LEAK FIX: Always clean up the temp job directory and the local
    //    merged video after upload, even if an error occurred mid-pipeline.
    //    Without this, Render's ephemeral disk (< 512 MB on free tier) fills
    //    up quickly across jobs and causes OOM / ENOSPC crashes.
    logger.info(`Cleaning up temp directory: ${tempDir}`);
    await fs.rm(tempDir, { recursive: true, force: true }).catch((err) =>
      logger.warn(`Failed to remove tempDir ${tempDir}: ${err.message}`)
    );
    await fs.rm(finalLocalVideoPath, { force: true }).catch((err) =>
      logger.warn(`Failed to remove finalLocalVideoPath ${finalLocalVideoPath}: ${err.message}`)
    );
  }
};
