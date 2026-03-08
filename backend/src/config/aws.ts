import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { S3Client } from '@aws-sdk/client-s3';
import { logger } from '../utils/logger.js';

const awsRegion = process.env.AWS_REGION || 'us-east-1';

const requiredAwsEnvVars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];

export const getAwsCredentials = () => {
  const missing = requiredAwsEnvVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    const message = `Missing AWS credentials: ${missing.join(', ')}. Please set them in your .env file or environment.`;
    logger.error(message);
    throw new Error(message);
  }

  // Trim whitespace from credentials to prevent signature mismatch errors
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID!.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY!.trim();

  // Validate credential format (basic validation)
  if (accessKeyId.length < 16) {
    const message = `Invalid AWS_ACCESS_KEY_ID format. Key appears to be truncated or invalid.`;
    logger.error(message);
    throw new Error(message);
  }

  if (secretAccessKey.length < 30) {
    const message = `Invalid AWS_SECRET_ACCESS_KEY format. Secret appears to be truncated or invalid.`;
    logger.error(message);
    throw new Error(message);
  }

  return { accessKeyId, secretAccessKey };
};

const getBedrockClient = () =>
  new BedrockRuntimeClient({
    region: awsRegion,
    credentials: getAwsCredentials(),
  });

// Lazy-initialized S3 client to prevent crash at startup
let _s3Client: S3Client | null = null;

export const getS3Client = (): S3Client => {
  if (!_s3Client) {
    const hasCredentials = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;
    if (!hasCredentials) {
      const message = 'AWS credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your .env file.';
      logger.error(message);
      throw new Error(message);
    }

    logger.info(`Initializing S3 client with region: ${awsRegion}`);
    _s3Client = new S3Client({
      region: awsRegion,
      credentials: getAwsCredentials(),
    });
  }
  return _s3Client;
};

// Export s3Client for backward compatibility (lazy getter)
export const s3Client = {
  get: () => getS3Client(),
  send: async (command: any) => getS3Client().send(command),
};

export const invokeBedrockModel = async (prompt: string): Promise<string> => {
  try {
    const modelId = process.env.BEDROCK_MODEL_ID || 'amazon.nova-lite-v1:0';

    const body = {
      messages: [
        {
          role: 'user',
          content: [
            {
              text: prompt,
            },
          ],
        },
      ],
      inferenceConfig: {
        maxTokens: 2000,  // FIX: was 200 — too small for JSON script output
        temperature: 0.3,
        topP: 0.9,
      },
    };

    const command = new InvokeModelCommand({
      modelId,
      body: JSON.stringify(body),
      contentType: 'application/json',
      accept: 'application/json',
    });

    const client = getBedrockClient();
    const response = await client.send(command);

    const decoded = new TextDecoder().decode(response.body);
    const result = JSON.parse(decoded);

    return result.output.message.content[0].text;

  } catch (error) {
    logger.error({ err: error }, 'Bedrock invocation error');

    const errorMessage =
      (error as any)?.message ||
      (typeof error === 'string' ? error : 'unknown error');

    throw new Error(`Failed to invoke Bedrock model: ${errorMessage}`);
  }
};
