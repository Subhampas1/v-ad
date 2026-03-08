import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { config } from 'dotenv';
config();

const getS3Client = () => new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

async function run() {
    const Bucket = process.env.S3_VIDEO_BUCKET || 'v-ad-videos';
    const Prefix = 'videos/1772979881576/';
    console.log(`Scanning s3://${Bucket}/${Prefix}...`);

    const s3 = getS3Client();
    const listResp = await s3.send(new ListObjectsV2Command({ Bucket, Prefix }));

    const objects = listResp.Contents || [];
    console.log(`Found ${objects.length} objects:`);
    for (const o of objects) {
        console.log(`- ${o.Key}  (${o.Size} bytes)`);
    }
}
run().catch(console.error);
