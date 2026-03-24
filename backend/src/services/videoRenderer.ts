import ffmpeg from "fluent-ffmpeg";
import { logger } from "../utils/logger.js";

export interface CinematicRenderInputs {
  bg: string;
  gradient: string;   // dark top gradient PNG
  textBrand: string;
  textHook: string;
  textSupport: string;
  textCTA: string;
}

const D = 15; // total ad duration in seconds

/**
 * Builds a 15-second ad video from pre-rendered PNGs using FFmpeg.
 *
 * Reveal timeline:
 *   0.0s   background
 *  +0.8s   dark gradient fades in (improves text contrast)
 *  +0.8s   brand fades in
 *  +1.6s   hook fades in
 *  +4.0s   support line fades in
 *  +9.0s   CTA button fades in + gentle brightness pulse
 *
 * Memory strategy:
 *  - No zoompan (user preference)
 *  - Simple scale+crop for bg
 *  - -loop 1 + -t on every still image input
 *  - ultrafast preset, 2 threads, crf 26
 */
export function renderCinematicAd(
  inputs: CinematicRenderInputs,
  outputPath: string
): Promise<string> {
  logger.info(`Rendering 15s cinematic ad → ${outputPath}`);

  return new Promise((resolve, reject) => {
    // Input index map
    // [0] bg  [1] gradient  [2] brand  [3] hook  [4] support  [5] cta
    const loopOpts = ["-loop", "1", "-t", String(D)];

    ffmpeg()
      .input(inputs.bg)       .inputOptions(loopOpts) // [0]
      .input(inputs.gradient) .inputOptions(loopOpts) // [1]
      .input(inputs.textBrand)  .inputOptions(loopOpts) // [2]
      .input(inputs.textHook)   .inputOptions(loopOpts) // [3]
      .input(inputs.textSupport).inputOptions(loopOpts) // [4]
      .input(inputs.textCTA)    .inputOptions(loopOpts) // [5]

      .complexFilter([
        // ── BG: scale + crop to 1080×1920 ─────────────────────────────────
        `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[bg]`,

        // ── Dark gradient strip over top 700px (readability) ──────────────
        // Fades in over 1s starting at 0.8s
        `[1:v]fade=t=in:st=0.6:d=1.0:alpha=1[grad]`,
        `[bg][grad]overlay=x=0:y=0[s0]`,

        // ── Brand name: fade in at 0.8s ───────────────────────────────────
        `[2:v]fade=t=in:st=0.8:d=0.8:alpha=1[brand]`,
        `[s0][brand]overlay=x='(main_w-overlay_w)/2':y=120[s1]`,

        // ── Hook: fade in at 1.6s ─────────────────────────────────────────
        `[3:v]fade=t=in:st=1.6:d=1.0:alpha=1[hook]`,
        `[s1][hook]overlay=x='(main_w-overlay_w)/2':y=300[s2]`,

        // ── Support line: fade in at 4.0s ─────────────────────────────────
        `[4:v]fade=t=in:st=4.0:d=1.0:alpha=1[support]`,
        `[s2][support]overlay=x='(main_w-overlay_w)/2':y=580[s3]`,

        // ── CTA button: fade in at 9.0s then pulse brightness ─────────────
        // Pulse: brightness oscillates ±10% at 1.5Hz via sine on luma eq
        `[5:v]fade=t=in:st=9.0:d=0.8:alpha=1,` +
          `eq=brightness='0.08*sin(2*PI*1.5*t)':enable='gte(t\\,9.8)'[cta]`,
        `[s3][cta]overlay=x='(main_w-overlay_w)/2':y=1640[final]`,
      ])

      .map("[final]")
      .outputOptions([
        "-c:v libx264",
        "-pix_fmt yuv420p",
        "-preset ultrafast",  // low RAM for Render free tier
        "-crf 26",
        "-threads 2",
        `-t ${D}`,
        "-r 30",
        "-movflags +faststart",
      ])
      .save(outputPath)
      .on("start", (cmd: string) => logger.info(`FFmpeg: ${cmd}`))
      .on("end", () => {
        logger.info(`✅ Ad rendered → ${outputPath}`);
        resolve(outputPath);
      })
      .on("error", (err: Error) => {
        logger.error("FFmpeg render error", { err });
        reject(err);
      });
  });
}
