import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";
import fs from "fs/promises";

export const generateVoiceover = async (text: string, outputPath: string): Promise<string> => {
    const client = new PollyClient({
        region: process.env.AWS_REGION || "us-east-1"
    });

    const command = new SynthesizeSpeechCommand({
        Engine: "neural",
        LanguageCode: "en-IN", // Can be configured based on language later
        VoiceId: "Kajal",     // Indian English female neural voice
        OutputFormat: "mp3",
        Text: text
    });

    const response = await client.send(command);

    if (response.AudioStream) {
        const stream = response.AudioStream as any;
        const buffer = Buffer.from(await stream.transformToByteArray());
        await fs.writeFile(outputPath, buffer);
        return outputPath;
    }

    throw new Error("No audio stream returned from Polly");
};
