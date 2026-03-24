import ffmpeg from "fluent-ffmpeg";
import sharp from "sharp";
import { logger } from "../utils/logger.js";

export interface CinematicRenderInputs {
  bg: string;
  textBrand: string;
  textHook: string;
  textCTA: string;
}

const AD_DURATION = 15;

/**
 * Composites text PNG overlays onto the background image using Sharp,
 * then encodes the single composite frame as a 15-second MP4.
 *
 * This avoids heavy FFmpeg filter graphs (zoompan, complex overlays)
 * that cause OOM on Render's free tier.
 */
export async function renderCinematicAd(
  inputs: CinematicRenderInputs,
  outputPath: string
): Promise<string> {
  logger.info(`Compositing text overlays onto background...`);

  // ── Step 1: Composite text layers onto background using Sharp ────────────
  // Sharp handles PNG alpha channels cleanly, is very memory-efficient,
  // and runs entirely in C++ — no FFmpeg filter graph needed.
  const compositedPath = outputPath.replace(".mp4", "_composite.jpg");

  await sharp(inputs.bg)
    .resize(1080, 1920, { fit: "cover", position: "center" })
    .composite([
      { input: inputs.textBrand, gravity: "north",  top: 120,  left: 0 },
      { input: inputs.textHook,  gravity: "north",  top: 300,  left: 0 },
      { input: inputs.textCTA,   gravity: "south",  top: 0,    left: 0, blend: "over" },
    ])
    .jpeg({ quality: 92 })
    .toFile(compositedPath);

  logger.info(`Composite image ready → ${compositedPath}`);

  // ── Step 2: Encode composite image as a 15-second MP4 ───────────────────
  // Single still image → video. No complex filters. Minimal RAM.
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(compositedPath)
      .inputOptions(["-loop 1", `-t ${AD_DURATION}`])
      .outputOptions([
        "-c:v libx264",
        "-pix_fmt yuv420p",
        "-preset ultrafast",
        "-crf 26",
        "-threads 2",
        `-t ${AD_DURATION}`,
        "-movflags +faststart",
      ])
      .fps(24)
      .save(outputPath)
      .on("start", (cmd: string) => {
        logger.info(`FFmpeg Rendering Command: ${cmd}`);
      })
      .on("end", async () => {
        // Clean up the intermediate composite image
        const { promises: fs } = await import("fs");
        await fs.rm(compositedPath, { force: true }).catch(() => null);
        logger.info(`✅ Video rendered → ${outputPath}`);
        resolve(outputPath);
      })
      .on("error", (err: Error) => {
        logger.error("Error rendering video", { err });
        reject(err);
      });
  });
}
