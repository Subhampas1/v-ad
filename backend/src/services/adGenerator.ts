import fs from "fs/promises";
import fsSync from "fs";
import { generateScript, ScriptGenerationInput } from "./scriptGenerator.js";
import { prepareImageForReplaceBackground } from "./imageProcessing.js";
import {
  createBrandLayer,
  createCTALayer,
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
  const textBrandPath   = path.join(tempDir, "text_brand.png");
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

    // Detect whether the product is worn by a human or is object-only,
    // and pick an appropriate ClipDrop background prompt.
    const aiPrompt = buildBackgroundPrompt(input, script);
    logger.info(`Generating AI background: "${aiPrompt}"`);
    try {
      await replaceBackground(productPadded, background, aiPrompt);
    } catch (err) {
      logger.error("ClipDrop background generation failed.");
      throw new Error("Failed to generate integrated ad frame from Clipdrop.");
    }

    // ── 3. Generate text layers ─────────────────────────────────────────────
    const brandName = (input.productName || input.businessType || "Brand");
    // CTA is always "Shop Now" — never use the long script callToAction
    const CTA_TEXT  = "Shop Now";

    logger.info(`Text — Brand: "${brandName}"`);

    await Promise.all([
      createBrandLayer(textBrandPath, brandName),
      createCTALayer(textCTAPath, CTA_TEXT),
    ]);

    // ── 4. Upload background as preview frame ───────────────────────────────
    const rawImageBuffer = await fs.readFile(background);
    const imageKey = `frames/${jobId}/scene-1.jpg`;
    const imageUrl = await uploadFrameToS3(rawImageBuffer.toString("base64"), imageKey);

    // ── 5. Render video (brand + CTA composited via Sharp) ──────────────────
    await renderCinematicAd(
      {
        bg:        background,
        textBrand: textBrandPath,
        textCTA:   textCTAPath,
      },
      videoOutput
    );

    // ── 6. Voiceover + merge ─────────────────────────────────────────────────
    const fullVoiceText =
      script.scenes?.map((s: any) => s.voiceoverText).join(" ") + ". " + CTA_TEXT;
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



/**
 * Picks a ClipDrop background prompt based on whether the product
 * is worn by a human model or is a standalone object.
 *
 * Rules:
 *  - Keywords suggesting person/model → adaptive lifestyle background
 *  - Everything else → clean studio with podium
 */
function buildBackgroundPrompt(input: any, script: any): string {
  const HUMAN_KEYWORDS = [
    "wear", "worn", "model", "man", "woman", "person", "boy", "girl",
    "outfit", "dress", "shirt", "jacket", "hoodie", "pants", "jeans",
    "clothing", "fashion", "apparel", "t-shirt", "tshirt", "kurta",
    "saree", "lehenga", "suit", "blazer", "coat", "sweater", "human",
  ];

  const haystack = [
    input.productName   ?? "",
    input.businessType  ?? "",
    input.productDescription ?? "",
    script?.background  ?? "",
    script?.scenes?.[0]?.description ?? "",
  ].join(" ").toLowerCase();

  const hasHuman = HUMAN_KEYWORDS.some((kw) => haystack.includes(kw));

  if (hasHuman) {
    // Lifestyle / adaptive background for model-worn clothing
    return (
      `${script?.background || "modern lifestyle background"},` +
      ` cinematic urban or natural environment, soft directional lighting,` +
      ` professional fashion photography, shallow depth of field, 8k resolution`
    );
  } else {
    // Studio podium for standalone product
    return (
      `${script?.background || "luxury product photography"},` +
      ` clean professional studio, elevated circular podium, soft cinematic lighting,` +
      ` dramatic dark background, sharp product focus, 8k resolution`
    );
  }
}
