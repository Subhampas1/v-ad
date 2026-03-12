import ffmpeg from "fluent-ffmpeg";
import { logger } from "../utils/logger.js";

// Currently musicPath is optional. If you have music, add a third input.
export function mergeAudio(videoPath: string, voicePath: string, outputPath: string): Promise<string> {
    logger.info(`Merging final video and audio...`);

    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(videoPath)
            .input(voicePath)
            // If the voiceover is shorter than 15s, it's fine.
            // The -shortest flag below will cut the video to the voiceover length if you want,
            // but usually for ads we want the full 15s visual. So we won't use -shortest.
            .outputOptions([
                "-c:v copy",   // Don't re-encode video
                "-c:a aac",    // Use AAC for audio compatibility
                "-map 0:v:0",  // Take video from input 0
                "-map 1:a:0"   // Take audio from input 1
            ])
            .save(outputPath)
            .on("end", () => {
                logger.info(`Successfully merged final video, saved to: ${outputPath}`);
                resolve(outputPath);
            })
            .on("error", (err) => {
                logger.error("Error merging final video", { err });
                reject(err);
            });
    });
}
