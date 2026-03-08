# V-AD Backend: AI-Powered Video Generation Platform

## 🎯 Overview

V-AD is a production-grade backend for generating cinematic product advertisements for Indian businesses using AI. It leverages **AWS Bedrock** for script generation, **FFmpeg** for video rendering, and a **Redis-based job queue** for scalable processing.

### Core Features

- ✅ AI-powered script generation (Bedrock + Claude 3 Sonnet)
- ✅ Multi-language support (English, Hindi, Telugu, Tamil, Kannada, Malayalam)
- ✅ Platform-optimized video generation (Reels, YouTube, WhatsApp)
- ✅ Background job queue with Bull + Redis
- ✅ Cloud storage with AWS S3 + CloudFront CDN
- ✅ PostgreSQL database with Prisma ORM
- ✅ Comprehensive error handling & logging
- ✅ Type-safe TypeScript architecture

---

## 📦 Architecture

```
Frontend (Next.js)
        ↓
API Layer (Express + TypeScript)
        ├─→ Script Generator (AWS Bedrock)
        ├─→ Job Queue Handler (Bull)
        └─→ Storage Manager (S3)
        ↓
Video Worker (Separate Process)
        ├─→ FFmpeg Processor
        ├─→ S3 Upload
        └─→ Job Status Updates
```

### Folder Structure

```
src/
├── api/
│   └── routes/
│       ├── auth.ts          (JWT authentication)
│       ├── script.ts        (Script generation)
│       ├── video.ts         (Video endpoints)
│       ├── job.ts           (Job status polling)
│       └── upload.ts        (Image/audio upload)
├── services/
│   ├── scriptGenerator.ts   (Bedrock integration)
│   ├── videoGenerator.ts    (FFmpeg wrapper)
│   ├── jobQueue.ts          (Bull queue management)
│   └── storage.ts           (S3 operations)
├── workers/
│   └── videoWorker.ts       (Background job processor)
├── config/
│   └── aws.ts               (AWS clients)
├── middleware/
│   └── errorHandler.ts      (Error handling)
├── utils/
│   └── logger.ts            (Logging)
└── index.ts                 (Server entry point)

prisma/
└── schema.prisma            (Database schema)
```

---

## 🚀 Setup Instructions

### Prerequisites

- **Node.js** >= 18.0.0
- **PostgreSQL** database
- **Redis** server
- **FFmpeg** installed on system
- **AWS Account** with:
  - Bedrock access (Claude 3 Sonnet model enabled)
  - S3 buckets created
  - IAM credentials with permissions

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Configure Environment

Copy the example file and update with your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Server
PORT=3000
NODE_ENV=development

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0

# S3
S3_BUCKET_NAME=v-ad-videos
S3_UPLOAD_BUCKET=v-ad-uploads
CLOUDFRONT_DOMAIN=https://d123456.cloudfront.net

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/v_ad_db

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_super_secret_key

# Video Settings
VIDEO_OUTPUT_DIR=./videos
VIDEO_TEMP_DIR=./temp
MAX_CONCURRENT_JOBS=5
```

### Step 3: Setup Database

Initialize Prisma and create tables:

```bash
npm run db:push
```

To view the database in Prisma Studio:

```bash
npm run db:studio
```

### Step 4: Start Redis

```bash
# Using Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or using Homebrew (macOS)
brew services start redis

# Or native Redis
redis-server
```

### Step 5: Install FFmpeg

**Ubuntu/Debian:**

```bash
sudo apt-get install ffmpeg
```

**macOS:**

```bash
brew install ffmpeg
```

**Windows:**

```bash
choco install ffmpeg
```

---

## 🔧 Development

### Start the API Server

```bash
npm run dev
```

Server runs on `http://localhost:3000`

### Start the Video Worker (in another terminal)

```bash
npm run worker
```

The worker listens for jobs in the Redis queue.

### Build for Production

```bash
npm run build
```

Compiled output goes to `./dist`

---

## 📡 API Endpoints

### Authentication

```
POST /api/auth/signup
POST /api/auth/login
GET /api/auth/profile
```

### Script Generation

```
POST /api/script/generate
  {
    "businessType": "E-commerce",
    "productName": "SmartPhone X",
    "language": "hi",
    "platform": "reels",
    "tone": "professional",
    "duration": 15
  }

GET /api/script/templates
GET /api/script/languages
```

### Video Generation

```
POST /api/video/generate
  {
    "scriptId": "script_xxx",
    "imagePath": "s3://uploads/img.jpg",
    "platform": "reels",
    "businessType": "E-commerce",
    "productName": "SmartPhone X"
  }

GET /api/video/formats/available
GET /api/video/:videoId
GET /api/video/:videoId/download
```

### Job Status

```
GET /api/job/:jobId/status
GET /api/job/stats/queue
POST /api/job/:jobId/poll
```

### File Upload

```
POST /api/upload/image (multipart/form-data)
POST /api/upload/audio (multipart/form-data)
GET /api/upload/status/:uploadId
```

---

## 🎬 Workflow Example

### 1. Generate Script

```bash
curl -X POST http://localhost:3000/api/script/generate \
  -H "Content-Type: application/json" \
  -d '{
    "businessType": "E-commerce",
    "productName": "SmartPhone X",
    "language": "hi",
    "platform": "reels",
    "tone": "professional"
  }'
```

**Response:**

```json
{
  "success": true,
  "scriptId": "script_1234567890",
  "script": {
    "title": "Experience Innovation",
    "scenes": [
      {
        "sceneNumber": 1,
        "duration": 5,
        "visualDescription": "Phone in hand with gleaming light",
        "voiceoverText": "अपने सपनों का स्मार्टफोन अब आपके हाथों में",
        "textOverlay": "SmartPhone X",
        "backgroundMusic": "Cinematic Electronic",
        "animation": "fadeIn"
      }
    ],
    "audioSuggestion": "Uplifting Electronic",
    "callToAction": "अभी ऑर्डर करें"
  },
  "generatedAt": "2026-02-28T10:30:00Z"
}
```

### 2. Upload Image

```bash
curl -X POST http://localhost:3000/api/upload/image \
  -F "image=@product.jpg"
```

**Response:**

```json
{
  "success": true,
  "uploadId": "upload_1234567890",
  "url": "https://d123456.cloudfront.net/uploads/upload_xxx/product.jpg",
  "filename": "product.jpg",
  "size": 256000
}
```

### 3. Generate Video

```bash
curl -X POST http://localhost:3000/api/video/generate \
  -H "Content-Type: application/json" \
  -d '{
    "scriptId": "script_1234567890",
    "imagePath": "https://d123456.cloudfront.net/uploads/upload_xxx/product.jpg",
    "platform": "reels",
    "businessType": "E-commerce",
    "productName": "SmartPhone X"
  }'
```

**Response:**

```json
{
  "message": "Video generation job created",
  "jobId": "1",
  "status": "queued",
  "estimatedTime": "2-5 minutes"
}
```

### 4. Poll Job Status

```bash
curl http://localhost:3000/api/job/1/status
```

**Response:**

```json
{
  "jobId": "1",
  "state": "active",
  "progress": 45,
  "timestamp": "2026-02-28T10:32:00Z"
}
```

When complete:

```json
{
  "jobId": "1",
  "state": "completed",
  "progress": 100,
  "result": {
    "videoUrl": "https://d123456.cloudfront.net/videos/user_xxx/reels/video_1_reels.mp4",
    "completedAt": "2026-02-28T10:34:00Z"
  }
}
```

---

## 🔐 Performance & Scalability

### Current Capacity

- **Max Concurrent Jobs:** 5 (configurable via `MAX_CONCURRENT_JOBS`)
- **Job Timeout:** 30 minutes per video
- **Retry Strategy:** 3 attempts with exponential backoff
- **Queue Persistence:** Redis (survives restarts)

### Scaling Strategies

1. **Increase Workers:** Run multiple `videoWorker.ts` instances on different machines
2. **Cluster Mode:** Use Bull clusters for distributed processing
3. **Resource Optimization:** Adjust FFmpeg presets (veryfast → slow)
4. **Database Optimization:** Add indexes, use read replicas
5. **CDN Caching:** CloudFront for video delivery

### Load Testing

```bash
# Send 100 concurrent script generation requests
for i in {1..100}; do
  curl -X POST http://localhost:3000/api/script/generate \
    -H "Content-Type: application/json" \
    -d '{"businessType":"Retail","productName":"Product","language":"en","platform":"reels"}' &
done
```

---

## 🐛 Debugging

### View Logs

```bash
# All logs
tail -f logs/*.log

# Real-time logs with filtering
npm run dev | grep -i error
```

### View Queue

```bash
# Redis CLI
redis-cli

# Check queue status
LLEN bull:video-generation:wait
LLEN bull:video-generation:active
```

### Database Debug

```bash
npm run db:studio
# Opens Prisma Studio at http://localhost:5555
```

---

## 📋 API Response Codes

| Status | Meaning              |
| ------ | -------------------- |
| 200    | Success              |
| 201    | Created              |
| 202    | Accepted (async job) |
| 400    | Bad Request          |
| 401    | Unauthorized         |
| 404    | Not Found            |
| 500    | Server Error         |

---

## 🔄 CI/CD Deployment

### Docker Setup

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

CMD ["node", "dist/index.js"]
```

Build and run:

```bash
docker build -t v-ad-backend .
docker run -p 3000:3000 --env-file .env v-ad-backend
```

### GitHub Actions Example

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm run build
      - run: npm run db:push
      - run: docker build -t v-ad .
      - run: docker push ${{ env.REGISTRY }}/v-ad:latest
```

---

## 📚 Documentation

- **[AWS Bedrock API](https://docs.aws.amazon.com/bedrock/latest/userguide/)**
- **[FFmpeg Documentation](https://ffmpeg.org/documentation.html)**
- **[Bull Queue Documentation](https://docs.bullmq.io/)**
- **[Prisma ORM](https://www.prisma.io/docs/)**
- **[Express.js Guide](https://expressjs.com/)**

---

## ⚠️ Production Checklist

- [ ] Set strong `JWT_SECRET`
- [ ] Enable HTTPS only
- [ ] Setup AWS Bedrock rate limiting
- [ ] Configure S3 bucket policies and versioning
- [ ] Enable CloudFront caching
- [ ] Setup database backups
- [ ] Monitor Redis memory usage
- [ ] Implement request rate limiting
- [ ] Add comprehensive logging and monitoring
- [ ] Setup health checks and alerting

---

## 📞 Support

For issues, feature requests, or contributions, please open an issue on GitHub.

---

## 📄 License

MIT License - See LICENSE file for details

---

**Built with ❤️ for Indian Businesses by AiforBharat**
