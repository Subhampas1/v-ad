import ffmpeg from "fluent-ffmpeg";
import sharp from "sharp";
import { promises as fs } from "fs";
import { logger } from "../utils/logger.js";

export interface CinematicRenderInputs {
  bg: string;
  textBrand: string;
  textCTA: string;
}

const AD_W = 1080;
const AD_H = 1920;
const AD_DURATION = 15;

/**
 * Composites brand name (top) and CTA button (bottom) onto the background
 * using Sharp, then encodes the single composite frame as a 15-second MP4.
 *
 * Why Sharp instead of FFmpeg overlays:
 *  - Sharp renders SVG text via librsvg with proper font lookup — reliable on Linux
 *  - No FFmpeg filter chain complexity or memory spikes
 *  - One composite PNG → trivial FFmpeg static-image encode
 */
export async function renderCinematicAd(
  inputs: CinematicRenderInputs,
  outputPath: string
): Promise<string> {
  logger.info(`Compositing ad frame...`);

  // ── Step 1: Get PNG dimensions so we can position CTA at bottom ──────────
  const [brandMeta, ctaMeta] = await Promise.all([
    sharp(inputs.textBrand).metadata(),
    sharp(inputs.textCTA).metadata(),
  ]);

  const brandH = brandMeta.height ?? 160;
  const ctaH   = ctaMeta.height ?? 130;
  const ctaW   = ctaMeta.width  ?? 560;

  // Brand at top (y=80, horizontally centered)
  const brandTop  = 80;
  const brandLeft = Math.round((AD_W - (brandMeta.width ?? AD_W)) / 2);

  // CTA at very bottom (y = 1920 - ctaHeight - 60 margin)
  const ctaTop    = AD_H - ctaH - 60;
  const ctaLeft   = Math.round((AD_W - ctaW) / 2);

  // ── Step 2: Composite onto background using Sharp ─────────────────────────
  const compositePath = outputPath.replace(".mp4", "_frame.jpg");

  await sharp(inputs.bg)
    .resize(AD_W, AD_H, { fit: "cover", position: "center" })
    .composite([
      { input: inputs.textBrand, top: brandTop,  left: brandLeft },
      { input: inputs.textCTA,   top: ctaTop,    left: ctaLeft   },
    ])
    .jpeg({ quality: 93 })
    .toFile(compositePath);

  logger.info(`Composite frame ready → ${compositePath}`);

  // ── Step 3: Encode as 15-second MP4 (minimal FFmpeg — no filter graph) ───
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(compositePath)
      .inputOptions(["-loop", "1", "-t", String(AD_DURATION)])
      .outputOptions([
        "-c:v libx264",
        "-pix_fmt yuv420p",
        "-preset ultrafast",
        "-crf 26",
        "-threads 2",
        `-t ${AD_DURATION}`,
        "-r 24",
        "-movflags +faststart",
      ])
      .save(outputPath)
      .on("start", (cmd: string) => logger.info(`FFmpeg: ${cmd}`))
      .on("end", async () => {
        await fs.rm(compositePath, { force: true }).catch(() => null);
        logger.info(`✅ Video rendered → ${outputPath}`);
        resolve(outputPath);
      })
      .on("error", (err: Error) => {
        logger.error("FFmpeg error", { err });
        reject(err);
      });
  });
}
