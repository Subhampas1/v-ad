import ffmpeg from "fluent-ffmpeg";
import { logger } from "../utils/logger.js";

export interface CinematicRenderInputs {
  bg: string;
  textBrand: string;
  textHook: string;
  textCTA: string;
}

// Video duration for the ad (seconds)
const AD_DURATION = 15;

export function renderCinematicAd(
  inputs: CinematicRenderInputs,
  outputPath: string
): Promise<string> {
  logger.info(`Rendering cinematic ${AD_DURATION}s ad video: ${outputPath}`);

  return new Promise((resolve, reject) => {
    ffmpeg()
      // MEMORY FIX: Use -t before each input to hard-limit decoded frames.
      // Avoid .loop(n) which inflates decoded frame count and RAM usage.
      .input(inputs.bg)
      .inputOptions([`-t ${AD_DURATION}`])
      .input(inputs.textBrand)
      .inputOptions([`-t ${AD_DURATION}`])
      .input(inputs.textHook)
      .inputOptions([`-t ${AD_DURATION}`])
      .input(inputs.textCTA)
      .inputOptions([`-t ${AD_DURATION}`])

      .complexFilter(
        [
          // Background: simple scale+crop (zoompan removed - too RAM heavy at 1080x1920)
          `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[bg_anim]`,

          // Text layers with fade-in animations
          `[1:v]format=rgba,colorchannelmixer=aa=1.0[tb_sized];[tb_sized]fade=t=in:st=0.5:d=1:alpha=1[brand_anim]`,
          `[2:v]format=rgba,colorchannelmixer=aa=1.0[th_sized];[th_sized]fade=t=in:st=1.5:d=1:alpha=1[hook_anim]`,
          `[3:v]format=rgba,colorchannelmixer=aa=1.0[tc_sized];[tc_sized]fade=t=in:st=9.0:d=1:alpha=1[cta_anim]`,

          // Composition
          `[bg_anim][brand_anim]overlay=x='(main_w-overlay_w)/2':y=120:shortest=1[comp1]`,
          `[comp1][hook_anim]overlay=x='(main_w-overlay_w)/2':y=300:shortest=1[comp2]`,
          `[comp2][cta_anim]overlay=x='(main_w-overlay_w)/2':y=1650:shortest=1[comp_final]`,
        ],
        "comp_final"
      )

      .fps(30)
      .outputOptions([
        // MEMORY FIX: ultrafast preset uses far less RAM than medium on Render free tier
        "-c:v libx264",
        "-pix_fmt yuv420p",
        "-preset ultrafast",
        "-crf 26",
        "-threads 2",
        `-t ${AD_DURATION}`,
        "-movflags +faststart",
      ])
      .save(outputPath)
      .on("start", (cmd: string) => {
        logger.info(`FFmpeg Rendering Command: ${cmd}`);
      })
      .on("end", () => {
        logger.info(`Cinematic ad video rendered -> ${outputPath}`);
        resolve(outputPath);
      })
      .on("error", (err: Error) => {
        logger.error("Error rendering cinematic ad", { err });
        reject(err);
      });
  });
}
