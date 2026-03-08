import { invokeBedrockModel } from '../config/aws.js';
import { logger } from '../utils/logger.js';

export interface ScriptGenerationInput {
  businessType: string;
  productName: string;
  language: 'en' | 'hi' | 'te' | 'ta' | 'kn' | 'ml';
  platform: 'reels' | 'youtube' | 'whatsapp';
  tone?: 'professional' | 'casual' | 'humorous' | 'emotional';
  duration?: 15 | 30 | 60;
  productContext?: string; // Injected from image analysis — describes what AI sees
}

export interface GeneratedScript {
  title: string;
  scenes: Scene[];
  audioSuggestion: string;
  background: string;
  callToAction: string;
  estimatedDuration: number;
}

export interface Scene {
  sceneNumber: number;
  duration: number;
  visualDescription: string;
  voiceoverText: string;
  textOverlay: string;
  backgroundMusic: string;
  animation: string;
}

const buildScriptPrompt = (input: ScriptGenerationInput): string => {
  const platformDuration = { reels: 15, youtube: 30, whatsapp: 15 };
  const duration = input.duration || platformDuration[input.platform];

  return `You are a professional video scriptwriter for Indian businesses. Generate a cinematic product advertisement script.

Business Information:
- Business Type: ${input.businessType}
- Product Name: ${input.productName}
- Target Language: ${input.language}
- Platform: ${input.platform}
- Tone: ${input.tone || 'professional'}
- Duration: ${duration} seconds
- Number of Scenes: ${duration === 15 ? 3 : duration === 30 ? 5 : 8}
${input.productContext ? `\nProduct Vision Analysis (base your script on this):\n${input.productContext}\n` : ''}
Generate ONLY a valid JSON object (no markdown, no code blocks) with exactly this structure:
{
  "title": "string - compelling ad title",
  "scenes": [
    {
      "sceneNumber": number,
      "duration": number in seconds,
      "visualDescription": "string - detailed visual elements to show",
      "voiceoverText": "string - script in ${input.language}",
      "textOverlay": "string - 2-3 word text to display",
      "backgroundMusic": "string - type of background music",
      "animation": "string - entrance/exit animation for text"
    }
  ],
  "audioSuggestion": "string - type of background audio",
  "background": "string - overall visual aesthetic",
  "callToAction": "string - CTA in ${input.language}",
  "estimatedDuration": number
}

Requirements:
1. Make it cinematic and professional
2. Adapt to ${input.platform} format (aspect ratio: ${input.platform === 'reels' ? '9:16' : input.platform === 'youtube' ? '16:9' : '9:16'})
3. Use ${input.language} for all text content
4. Each scene should be ${duration / (duration === 15 ? 3 : duration === 30 ? 5 : 8)} seconds
5. Include compelling visuals and emotional connection
6. Strong call to action at the end`;
};

export const generateScript = async (
  input: ScriptGenerationInput
): Promise<GeneratedScript> => {
  try {
    logger.info('Generating script for:', input);

    const prompt = buildScriptPrompt(input);
    const response = await invokeBedrockModel(prompt);

    const jsonMatch = response.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("Model did not return JSON");
    }

    let jsonString = jsonMatch[0];

    // Clean common AI formatting issues
    jsonString = jsonString
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .replace(/\n/g, " ")
      .replace(/\t/g, " ");

    let script: GeneratedScript;

    try {
      script = JSON.parse(jsonString);
    } catch (err) {

      logger.warn("Initial JSON parse failed. Attempting repair...");

      const repairPrompt = `
Fix this JSON and return ONLY valid JSON:

${jsonString}
`;

      const repaired = await invokeBedrockModel(repairPrompt);

      const repairedMatch = repaired.match(/\{[\s\S]*\}/);

      if (!repairedMatch) {
        throw new Error("Model returned malformed JSON and repair failed");
      }

      script = JSON.parse(repairedMatch[0]);
    }

    script.scenes = script.scenes.map((scene: any, index: number) => ({
      sceneNumber: scene.sceneNumber ?? index + 1,
      duration: scene.duration ?? 5,
      visualDescription:
        scene.visualDescription ||
        scene.visual ||
        "Product showcase",

      voiceoverText:
        scene.voiceoverText ||
        scene.voiceOverText ||
        scene.voiceover ||
        "",

      textOverlay:
        scene.textOverlay ||
        scene.overlay ||
        "",

      backgroundMusic:
        scene.backgroundMusic ||
        "uplifting",

      animation:
        scene.animation ||
        "fade-in"
    }));

    script.audioSuggestion =
      script.audioSuggestion || "Upbeat promotional music";

    script.callToAction =
      script.callToAction ||
      "Try it today!";

    script.estimatedDuration =
      script.estimatedDuration || 15;

    if (!validateScriptStructure(script)) {
      throw new Error("Generated script has invalid structure");
    }

    logger.info("Script generated successfully");

    return script;

  } catch (error) {
    logger.error({ err: error }, "Script generation error");

    throw new Error(
      `Failed to generate script: ${error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};

export const validateScriptStructure = (script: unknown): script is GeneratedScript => {
  const s = script as any;
  return (
    typeof s === 'object' &&
    s !== null &&
    typeof s.title === 'string' &&
    Array.isArray(s.scenes) &&
    s.scenes.length > 0 &&
    s.scenes.every(
      (scene: any) =>
        typeof scene.sceneNumber === 'number' &&
        typeof scene.duration === 'number' &&
        typeof scene.visualDescription === 'string' &&
        typeof scene.voiceoverText === 'string' &&
        typeof scene.textOverlay === 'string'
    ) &&
    typeof s.audioSuggestion === 'string' &&
    typeof s.callToAction === 'string' &&
    typeof s.estimatedDuration === 'number'
  );
};
