import { Upload } from '@aws-sdk/lib-storage';
import { getS3Client } from '../config/aws.js';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';

export interface S3UploadOptions {
  bucket: string;
  key: string;
  contentType?: string;
  metadata?: Record<string, string>;
}

export const uploadToS3 = async (
  filePath: string,
  options: S3UploadOptions
): Promise<string> => {
  try {
    const fileBuffer = await fs.readFile(filePath);
    const fileName = path.basename(filePath);

    logger.info(`Starting S3 upload: bucket=${options.bucket}, key=${options.key || fileName}, size=${fileBuffer.length} bytes`);

    const upload = new Upload({
      client: getS3Client(),
      params: {
        Bucket: options.bucket,
        Key: options.key || fileName,
        Body: fileBuffer,
        ContentType: options.contentType || 'application/octet-stream',
        Metadata: options.metadata,
      },
    });

    // Monitor upload progress
    upload.on('httpUploadProgress', (progress) => {
      logger.info(`Upload progress: ${progress.loaded}/${progress.total} bytes (${Math.round((progress.loaded || 0) / (progress.total || 1) * 100)}%)`);
    });

    await upload.done();
    const s3Url = `https://${options.bucket}.s3.amazonaws.com/${options.key || fileName}`;

    logger.info(`✅ File uploaded to S3: ${s3Url}`);
    return s3Url;
  } catch (error: any) {
    // Provide more helpful error messages for common S3 issues
    const errorMessage = error?.message || String(error);

    if (errorMessage.includes('The request signature we calculated does not match')) {
      logger.error({ err: error }, 'S3 signature mismatch - check AWS credentials (ensure no extra whitespace)');
      throw new Error(`Failed to upload to S3: Signature mismatch. Please verify your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are correct with no extra whitespace.`);
    } else if (errorMessage.includes('Access Denied')) {
      logger.error({ err: error }, 'S3 access denied - check IAM permissions');
      throw new Error(`Failed to upload to S3: Access denied. Please verify your IAM user has s3:PutObject permission for bucket ${options.bucket}`);
    } else if (errorMessage.includes('NoSuchBucket')) {
      logger.error({ err: error }, 'S3 bucket does not exist');
      throw new Error(`Failed to upload to S3: Bucket ${options.bucket} does not exist. Please create the bucket or check the bucket name.`);
    }

    logger.error({ err: error }, 'S3 upload error');
    throw new Error(`Failed to upload to S3: ${errorMessage}`);
  }
};

export const downloadFromS3 = async (
  bucket: string,
  key: string,
  outputPath: string
): Promise<string> => {
  try {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });

    const response = await getS3Client().send(command);
    const chunks: Uint8Array[] = [];

    // Collect chunks from the stream
    if (response.Body instanceof ReadableStream) {
      const reader = response.Body.getReader();
      let result = await reader.read();
      while (!result.done) {
        chunks.push(new Uint8Array(result.value));
        result = await reader.read();
      }
    }

    // Combine chunks and write to file
    const buffer = Buffer.concat(chunks.map((c) => Buffer.from(c)));
    await fs.writeFile(outputPath, buffer);

    logger.info(`✅ File downloaded from S3: ${outputPath}`);
    return outputPath;
  } catch (error) {
    logger.error('S3 download error:', error);
    throw new Error(`Failed to download from S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const getS3SignedUrl = async (bucket: string, key: string, expiresIn = 3600): Promise<string> => {
  try {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const url = await getSignedUrl(getS3Client(), command, { expiresIn });

    logger.info(`Generated signed URL for ${key}`);
    return url;
  } catch (error) {
    logger.error('Signed URL generation error:', error);
    throw new Error(`Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const deleteFromS3 = async (bucket: string, key: string): Promise<void> => {
  try {
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const command = new DeleteObjectCommand({ Bucket: bucket, Key: key });

    await getS3Client().send(command);
    logger.info(`✅ File deleted from S3: ${key}`);
  } catch (error) {
    logger.error('S3 delete error:', error);
    throw new Error(`Failed to delete from S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const listS3Objects = async (bucket: string, prefix = ''): Promise<string[]> => {
  try {
    const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    const command = new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix });

    const response = await getS3Client().send(command);
    const objects = response.Contents?.map((obj) => obj.Key || '') || [];

    logger.info(`Listed ${objects.length} objects from S3 bucket ${bucket}`);
    return objects;
  } catch (error) {
    logger.error('S3 list error:', error);
    throw new Error(`Failed to list objects from S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

