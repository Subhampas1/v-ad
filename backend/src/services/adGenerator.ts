import fs from "fs/promises";
import { generateScript, ScriptGenerationInput } from "./scriptGenerator.js";
import { buildScenePrompt } from "./sceneGenerator.js";
import { generateSceneImage } from "./imageGenerator.js";
import { createSceneVideo } from "./sceneVideo.js";
import { generateVoiceover } from "./voiceover.js";
import { mergeVideos } from "./videoAssembler.js";
import path from "path";

export interface AdGenerationResult {
    script: any;
    sceneVisuals: {
        sceneNumber: number;
        imageUrl: string;
        videoUrl: string;
    }[];
    finalVideoUrl: string;
}

export const generateAd = async (input: ScriptGenerationInput, jobId: string, uploadFrameToS3: (b64: string, key: string) => Promise<string>, uploadVideoToS3: (localPath: string, key: string) => Promise<string>, existingScript?: any): Promise<AdGenerationResult> => {

    // 1. Generate or Use Existing Script
    const script = existingScript || await generateScript(input);

    const sceneVideos: string[] = [];
    const sceneVisuals: any[] = [];

    // temp directory for intermediate files
    const tempDir = path.join(process.env.VIDEO_OUTPUT_DIR || "./videos", jobId);
    await fs.mkdir(tempDir, { recursive: true });

    for (const scene of script.scenes) {
        // 2. Generate Image Prompt
        const prompt = buildScenePrompt(input.productName, scene);

        // 3. Generate Image Base64
        const imageBase64 = await generateSceneImage(prompt);

        // Upload image to S3 (for frontend to display)
        const imageKey = `frames/${jobId}/scene-${scene.sceneNumber}.png`;
        const imageUrl = await uploadFrameToS3(imageBase64, imageKey);

        // Save image locally for FFmpeg
        const localImagePath = path.join(tempDir, `scene-${scene.sceneNumber}.png`);
        await fs.writeFile(localImagePath, Buffer.from(imageBase64, "base64"));

        // 4. Generate Voiceover
        let localAudioPath: string | null = null;
        if (scene.voiceoverText && scene.voiceoverText.trim().length > 0) {
            localAudioPath = path.join(tempDir, `scene-${scene.sceneNumber}.mp3`);
            await generateVoiceover(scene.voiceoverText, localAudioPath);
        }

        // 5. Generate Scene Video (Image + Audio)
        const localVideoPath = path.join(tempDir, `scene-${scene.sceneNumber}.mp4`);
        await createSceneVideo(localImagePath, localAudioPath, localVideoPath);

        // Upload individual scene video for visualization (optional, maybe frontend just needs image)
        const videoKey = `videos/${jobId}/scene-${scene.sceneNumber}.mp4`;
        const videoUrl = await uploadVideoToS3(localVideoPath, videoKey);

        sceneVideos.push(localVideoPath);
        sceneVisuals.push({
            sceneNumber: scene.sceneNumber,
            imageUrl,
            videoUrl
        });
    }

    // 6. Merge All Scenes
    const finalLocalVideo = path.join(process.env.VIDEO_OUTPUT_DIR || "./videos", `${jobId}.mp4`);
    await mergeVideos(sceneVideos, finalLocalVideo);

    // Upload Final Video
    const finalKey = `videos/${jobId}/final.mp4`;
    const finalVideoUrl = await uploadVideoToS3(finalLocalVideo, finalKey);

    // cleanup intermediate temp files could go here...

    return {
        script,
        sceneVisuals,
        finalVideoUrl
    };
};
