import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";
import fs from "fs/promises";
import { logger } from "../utils/logger.js";

const polly = new PollyClient({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    }
});

export async function generateVoice(script: string, outputPath: string): Promise<string> {
    logger.info(`Generating voiceover: "${script.substring(0, 50)}..."`);

    try {
        const command = new SynthesizeSpeechCommand({
            OutputFormat: "mp3",
            Text: script,
            VoiceId: "Joanna", // You can make this dynamic if needed
            Engine: "neural" // Better quality
        });

        const res = await polly.send(command);

        if (!res.AudioStream) {
            throw new Error("No AudioStream returned from Polly");
        }

        const byteArray = await res.AudioStream.transformToByteArray();
        await fs.writeFile(outputPath, Buffer.from(byteArray));

        logger.info(`Successfully generated voiceover, saved to: ${outputPath}`);
        return outputPath;
    } catch (error) {
        logger.error("Error generating voiceover", { error });
        throw error;
    }
}
