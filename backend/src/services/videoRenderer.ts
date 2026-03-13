import ffmpeg from "fluent-ffmpeg";
import { logger } from "../utils/logger.js";

export interface CinematicRenderInputs {
    bg: string;
    textBrand: string;
    textHook: string;
    textCTA: string;
}

export function renderCinematicAd(inputs: CinematicRenderInputs, outputPath: string): Promise<string> {
    logger.info(`Rendering cinematic 15s ad video: ${outputPath}`);

    return new Promise((resolve, reject) => {
        ffmpeg()
            // [0:v] Background (Integrated image from ClipDrop)
            .input(inputs.bg).loop(15)
            // [1:v] Text Brand
            .input(inputs.textBrand).loop(15)
            // [2:v] Text Hook
            .input(inputs.textHook).loop(15)
            // [3:v] Text CTA
            .input(inputs.textCTA).loop(15)

            .complexFilter([
                // 1. Background Animation: Crop to fill 9:16, slow zoom
                `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(zoom+0.001,1.1)':d=450:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920[bg_anim]`,

                // 2. Animate text (fade in)
                `[1:v]format=rgba,colorchannelmixer=aa=1.0[tb_sized];[tb_sized]fade=t=in:st=0.5:d=1:alpha=1[brand_anim]`,
                `[2:v]format=rgba,colorchannelmixer=aa=1.0[th_sized];[th_sized]fade=t=in:st=1.5:d=1:alpha=1[hook_anim]`,
                `[3:v]format=rgba,colorchannelmixer=aa=1.0[tc_sized];[tc_sized]fade=t=in:st=9.0:d=1:alpha=1[cta_anim]`,

                // 3. Composition
                // Brand at Top (y=120)
                `[bg_anim][brand_anim]overlay=x='(main_w-overlay_w)/2':y=120:shortest=1[comp1]`,
                // Hook right below Brand (y=300)
                `[comp1][hook_anim]overlay=x='(main_w-overlay_w)/2':y=300:shortest=1[comp2]`,
                // CTA at Bottom (y=1650)
                `[comp2][cta_anim]overlay=x='(main_w-overlay_w)/2':y=1650:shortest=1[comp_final]`
            ], 'comp_final')

            .fps(30)
            .outputOptions([
                "-c:v libx264",
                "-pix_fmt yuv420p",
                "-preset medium",
                "-crf 23",
                "-t 15",
                "-movflags +faststart"
            ])
            .save(outputPath)
            .on("start", (cmd: string) => {
                logger.info(`FFmpeg Rendering Command: ${cmd}`);
            })
            .on("end", () => {
                logger.info(`Cinematic ad video completely rendered → ${outputPath}`);
                resolve(outputPath);
            })
            .on("error", (err: Error) => {
                logger.error("Error rendering cinematic ad", { err });
                reject(err);
            });
    });
}
