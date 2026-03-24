import fs from "fs/promises";
import fsSync from "fs";
import { generateScript, ScriptGenerationInput } from "./scriptGenerator.js";
import { prepareImageForReplaceBackground } from "./imageProcessing.js";
import {
  createBrandLayer,
  createHookLayer,
  createSupportLayer,
  createCTALayer,
  createTopGradient,
} from "./textOverlay.js";
import { renderCinematicAd } from "./videoRenderer.js";
import { replaceBackground } from "./clipdropEditor.js";
import { generateVoice } from "./generateVoice.js";
import { mergeAudio } from "./finalVideo.js";
import path from "path";
import { logger } from "../utils/logger.js";

export interface AdGenerationResult {
  script: any;
  sceneVisuals: { sceneNumber: number; imageUrl: string; videoUrl: string }[];
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
  logger.info(`Starting Ad Generation Pipeline for job ${jobId}`);

  const script = existingScript || await generateScript(input);

  const tempDir = path.join(process.env.VIDEO_OUTPUT_DIR || "./videos", jobId);
  await fs.mkdir(tempDir, { recursive: true });

  // Asset paths
  const localProductImagePath = path.join(tempDir, "product_raw.png");
  const productPadded   = path.join(tempDir, "product_padded.png");
  const background      = path.join(tempDir, "generated_bg.jpg");
  const gradientPath    = path.join(tempDir, "gradient_top.png");
  const textBrandPath   = path.join(tempDir, "text_brand.png");
  const textHookPath    = path.join(tempDir, "text_hook.png");
  const textSupportPath = path.join(tempDir, "text_support.png");
  const textCTAPath     = path.join(tempDir, "text_cta.png");
  const videoOutput     = path.join(tempDir, "ad_base.mp4");
  const finalLocalVideoPath = path.join(
    process.env.VIDEO_OUTPUT_DIR || "./videos",
    `${jobId}.mp4`
  );

  try {
    // ── 1. Obtain product image ─────────────────────────────────────────────
    if (rawImagePath && fsSync.existsSync(rawImagePath)) {
      await fs.copyFile(rawImagePath, localProductImagePath);
    } else if (input.imageUrl) {
      logger.info(`Downloading product image from: ${input.imageUrl}`);
      const res = await fetch(input.imageUrl);
      const buffer = await res.arrayBuffer();
      await fs.writeFile(localProductImagePath, Buffer.from(buffer));
    } else {
      throw new Error("No image source provided.");
    }

    // ── 2. Prepare product + generate AI background ─────────────────────────
    await prepareImageForReplaceBackground(localProductImagePath, productPadded);

    const aiPrompt = `${script.background || "luxury product photography background"}, professional commercial product photography studio background, soft cinematic lighting, 8k resolution`;
    logger.info(`Generating AI background: "${aiPrompt}"`);
    try {
      await replaceBackground(productPadded, background, aiPrompt);
    } catch (err) {
      logger.error("ClipDrop background generation failed.");
      throw new Error("Failed to generate integrated ad frame from Clipdrop.");
    }

    // ── 3. Generate all text layers ─────────────────────────────────────────
    // Copy text to adhere to the spec: short, punchy, hierarchy
    const brandName   = (input.productName || input.businessType || "Brand").toUpperCase();
    const hook        = trimToWords(script.scenes?.[0]?.voiceoverText || "NEW COLLECTION", 6);
    const supportLine = trimToWords(script.scenes?.[1]?.voiceoverText || "Premium quality guaranteed", 8);
    const cta         = script.callToAction || "SHOP NOW";

    logger.info(`Text layers — Brand: "${brandName}" | Hook: "${hook}" | Support: "${supportLine}" | CTA: "${cta}"`);

    await Promise.all([
      createTopGradient(gradientPath),
      createBrandLayer(textBrandPath, brandName),
      createHookLayer(textHookPath, hook),
      createSupportLayer(textSupportPath, supportLine),
      createCTALayer(textCTAPath, cta),
    ]);

    // ── 4. Upload background as preview frame ───────────────────────────────
    const rawImageBuffer = await fs.readFile(background);
    const imageKey = `frames/${jobId}/scene-1.jpg`;
    const imageUrl = await uploadFrameToS3(rawImageBuffer.toString("base64"), imageKey);

    // ── 5. Render cinematic video ────────────────────────────────────────────
    await renderCinematicAd(
      {
        bg:          background,
        gradient:    gradientPath,
        textBrand:   textBrandPath,
        textHook:    textHookPath,
        textSupport: textSupportPath,
        textCTA:     textCTAPath,
      },
      videoOutput
    );

    // ── 6. Voiceover + merge ─────────────────────────────────────────────────
    const fullVoiceText =
      script.scenes?.map((s: any) => s.voiceoverText).join(" ") + ". " + cta;
    const voicePath = path.join(tempDir, "voice.mp3");
    await generateVoice(fullVoiceText, voicePath);
    await mergeAudio(videoOutput, voicePath, finalLocalVideoPath);

    // ── 7. Upload final video ────────────────────────────────────────────────
    const finalKey = `videos/${jobId}/final.mp4`;
    const finalVideoUrl = await uploadVideoToS3(finalLocalVideoPath, finalKey);

    return {
      script,
      sceneVisuals: [{ sceneNumber: 1, imageUrl, videoUrl: finalVideoUrl }],
      finalVideoUrl,
    };
  } finally {
    // ── Cleanup: always remove temp job dir to prevent disk exhaustion ──────
    logger.info(`Cleaning up temp directory: ${tempDir}`);
    await fs.rm(tempDir, { recursive: true, force: true }).catch((e) =>
      logger.warn(`Cleanup failed for ${tempDir}: ${e.message}`)
    );
    await fs.rm(finalLocalVideoPath, { force: true }).catch(() => null);
  }
};

/** Trim a string to at most N words */
function trimToWords(text: string, maxWords: number): string {
  return text.split(/\s+/).slice(0, maxWords).join(" ");
}
