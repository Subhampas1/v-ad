import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

export const generateSceneImage = async (prompt: string) => {
    const client = new BedrockRuntimeClient({
        region: process.env.AWS_REGION || "us-east-1"
    });

    const body = {
        taskType: "TEXT_IMAGE",
        textToImageParams: {
            text: prompt
        },
        imageGenerationConfig: {
            numberOfImages: 1,
            quality: "premium",
            width: 1024,
            height: 1024
        }
    };

    const command = new InvokeModelCommand({
        modelId: "amazon.titan-image-generator-v1",
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(body)
    });

    const response = await client.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.body));

    return result.images[0]; // base64 string
};
