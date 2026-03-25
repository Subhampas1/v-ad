import ffmpeg from "fluent-ffmpeg";
import sharp from "sharp";
import { promises as fs } from "fs";
import { logger } from "../utils/logger.js";

export interface CinematicRenderInputs {
  bg: string;        // background image (from ClipDrop)
  textBrand: string; // brand name PNG
  textCTA: string;   // "Shop Now" button PNG
}

const AD_W      = 1080;
const AD_H      = 1920;
const AD_DUR    = 15;   // seconds
const BLINK_HZ  = 1.2;  // blinks per second

/**
 * Pipeline:
 *  1. Sharp: composite brand name onto background → intermediate JPEG
 *  2. FFmpeg: overlay blinking CTA button on top, encode as 15s MP4
 *
 * The blink uses FFmpeg's `-if(lt(mod(t, T), T/2), 1, 0)` on the CTA alpha,
 * which gives a hard on/off blink at BLINK_HZ Hz — no extra RAM.
 */
export async function renderCinematicAd(
  inputs: CinematicRenderInputs,
  outputPath: string
): Promise<string> {

  // ── 1. Composite: background + brand name via Sharp ──────────────────────
  const framePath = outputPath.replace(".mp4", "_nobtn.jpg");

  const brandMeta = await sharp(inputs.textBrand).metadata();
  const brandW    = brandMeta.width  ?? AD_W;
  const brandTop  = 80;
  const brandLeft = Math.round((AD_W - brandW) / 2);

  await sharp(inputs.bg)
    .resize(AD_W, AD_H, { fit: "cover", position: "center" })
    .composite([{ input: inputs.textBrand, top: brandTop, left: brandLeft }])
    .jpeg({ quality: 93 })
    .toFile(framePath);

  logger.info(`Brand composited → ${framePath}`);

  // ── 2. FFmpeg: blinking CTA overlay → MP4 ───────────────────────────────
  const ctaMeta = await sharp(inputs.textCTA).metadata();
  const ctaW    = ctaMeta.width  ?? 560;
  const ctaH    = ctaMeta.height ?? 130;

  // Center CTA horizontally, sit 60px from bottom
  const ctaLeft = Math.round((AD_W - ctaW) / 2);
  const ctaTop  = AD_H - ctaH - 60;

  const blinkPeriod = (1 / BLINK_HZ).toFixed(3);

  return new Promise((resolve, reject) => {
    ffmpeg()
      // [0] Background frame with brand
      .input(framePath)
      .inputOptions(["-loop", "1", "-t", String(AD_DUR)])
      // [1] CTA button PNG
      .input(inputs.textCTA)
      .inputOptions(["-loop", "1", "-t", String(AD_DUR)])

      .complexFilter([
        // Scale bg to exact output resolution
        `[0:v]scale=${AD_W}:${AD_H},setsar=1[bg]`,
        // Blink: full alpha for first half of each period, zero for second half
        `[1:v]colorchannelmixer=aa='if(lt(mod(t,${blinkPeriod}),${(1 / BLINK_HZ / 2).toFixed(3)}),1,0)'[cta_blink]`,
        // Overlay CTA at bottom-center
        `[bg][cta_blink]overlay=x=${ctaLeft}:y=${ctaTop}[out]`,
      ])
      .map("[out]")
      .outputOptions([
        "-c:v libx264",
        "-pix_fmt yuv420p",
        "-preset ultrafast",
        "-crf 26",
        "-threads 2",
        `-t ${AD_DUR}`,
        "-r 24",
        "-movflags +faststart",
      ])
      .save(outputPath)
      .on("start", (cmd: string) => logger.info(`FFmpeg: ${cmd}`))
      .on("end", async () => {
        await fs.rm(framePath, { force: true }).catch(() => null);
        logger.info(`✅ Video rendered → ${outputPath}`);
        resolve(outputPath);
      })
      .on("error", (err: Error) => {
        logger.error("FFmpeg render error", { err });
        reject(err);
      });
  });
}
