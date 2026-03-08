# 🚀 Frontend Setup Guide

## Quick Start (5 minutes)

### Option 1: Docker Compose (Easiest)

From the root project directory that has both `v-ad` and `v-ad-frontend`:

```bash
# Create docker-compose.yml in project root
cd ../
docker-compose up -d

# Access frontend: http://localhost:3000
# Access backend API: http://localhost:3001
```

### Option 2: Local Development

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Start dev server
npm run dev
```

Frontend runs on `http://localhost:3000`

---

## Complete Setup (Step by Step)

### Prerequisites

- Node.js >= 18 ([Download](https://nodejs.org/))
- npm >= 9 (comes with Node.js)

### Step 1: Install Dependencies

```bash
cd v-ad-frontend
npm install
```

This installs ~600 packages (mostly Next.js + dependencies). Takes 1-3 minutes.

### Step 2: Configure Environment

```bash
# Copy template
cp .env.example .env.local

# Edit the file
nano .env.local  # or use your editor
```

**Update these values:**

```env
# Make sure backend API is running first
NEXT_PUBLIC_API_URL=http://localhost:3000

# Optional features
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_WATERMARK=true
```

### Step 3: Verify Setup

```bash
# Type check
npm run type-check

# Lint
npm run lint
```

Both should pass without errors.

### Step 4: Start Development Server

```bash
npm run dev
```

Output should show:

```
▲ Next.js 14.0.4
  - Local:        http://localhost:3000
  - Environments: .env.local
```

**Open browser**: `http://localhost:3000`

---

## Architecture Overview

### Frontend Structure

```
v-ad-frontend/
├── src/
│   ├── pages/           # Next.js routes
│   │   ├── index.tsx    (Home)
│   │   ├── login.tsx    (Auth)
│   │   ├── signup.tsx   (Auth)
│   │   ├── create.tsx   (Main workflow)
│   │   └── dashboard.tsx (User space)
│   │
│   ├── components/      # Reusable React components
│   │   ├── Layout.tsx   (Wrapper)
│   │   ├── FileUpload.tsx (Drop zone)
│   │   └── ui/          (Buttons, Forms, etc)
│   │
│   ├── lib/             # Business logic
│   │   ├── api.ts       (Axios client)
│   │   ├── hooks/       (Custom React hooks)
│   │   └── store/       (Zustand state)
│   │
│   └── styles/          # Tailwind CSS
│
├── public/              # Static files
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
├── next.config.js       # Next.js config
├── tailwind.config.js   # Tailwind config
└── postcss.config.js    # CSS processing
```

### Key Directories Explained

**`src/pages/`** - Automatically routed by Next.js

- `pages/index.tsx` → `/`
- `pages/login.tsx` → `/login`
- `pages/create.tsx` → `/create`

**`src/components/`** - React components (not auto-routed)

- Reusable UI elements
- Layout wrapper
- File upload handler

**`src/lib/`** - Utilities & business logic

- `api.ts` - Axios client with all endpoints
- `hooks/useAPI.ts` - Custom React hooks
- `store/` - Zustand stores for global state

---

## Data Flow

### Authentication Flow

```
User Opens App
    ↓
localStorage has token?
    ├─ Yes → checkAuth() → Load user profile
    └─ No → Redirect to /login
    ↓
Login Page
    ↓
User enters credentials
    ↓
login() → POST /api/auth/login
    ↓
Save token to localStorage
    ↓
Redirect to /dashboard
```

### Video Creation Flow

```
Upload Image
    ↓ (uploadImage)
S3 URL returned
    ↓
Enter Business Details
    ↓
Generate Script
    ↓ (generateScript)
AI creates script → Show in preview
    ↓
Confirm & Generate Video
    ↓ (generateVideo)
Job queued on backend
    ↓
Poll job status every 2 seconds
    ↓
Job complete
    ↓
Download MP4
```

---

## State Management (Zustand)

### Auth Store

```typescript
// src/lib/store/authStore.ts
import { useAuthStore } from '@/lib/store/authStore'

const { user, token, login, logout, isLoading } = useAuthStore()

// Use in components
if (user) {
  <p>Welcome {user.name}</p>
}
```

### Video Store

```typescript
// src/lib/store/videoStore.ts
import { useVideoStore } from "@/lib/store/videoStore";

const {
  scriptId,
  imageUrl,
  selectedPlatform,
  generatedVideoUrl,
  setScript,
  setImage,
  reset,
} = useVideoStore();
```

---

## Custom Hooks

### useGenerateScript

```typescript
const { script, scriptId, isLoading, error, generate } = useGenerateScript();

const handleGenerate = async () => {
  const result = await generate({
    businessType: "E-commerce",
    productName: "Product",
    language: "hi",
    platform: "reels",
  });
  console.log(result.scriptId);
};
```

### useJobStatus

```typescript
const { status, isLoading, checkStatus } = useJobStatus(jobId);

// status.state: "queued" | "active" | "completed" | "failed"
// status.progress: 0-100
// status.result?.videoUrl: generated video URL
```

### useUploadImage

```typescript
const { uploadUrl, isLoading, upload } = useUploadImage();

const handleUpload = async (file: File) => {
  const result = await upload(file);
  console.log(result.url); // S3 URL
};
```

---

## Building for Production

### Option 1: Vercel (Recommended)

1. Push code to GitHub
2. Import repo to Vercel
3. Set environment variables in Vercel dashboard
4. Auto-deploys on git push

### Option 2: Docker

```bash
# Build image
docker build -t v-ad-frontend .

# Run container
docker run -p 3000:3000 -e NEXT_PUBLIC_API_URL=https://api.yourdomain.com v-ad-frontend
```

### Option 3: Manual Server

```bash
# Build
npm run build

# Start
npm start
# Runs on port 3000
```

---

## Common Issues & Solutions

### Issue: "Cannot connect to API"

**Solution:**

```env
# Make sure backend is running
NEXT_PUBLIC_API_URL=http://localhost:3000

# Or if running on different machine
NEXT_PUBLIC_API_URL=http://192.168.1.100:3000
```

### Issue: "Module not found"

**Solution:**

```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run dev
```

### Issue: "Port 3000 already in use"

**Solution:**

```bash
# macOS/Linux
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Windows
netstat -ano | findstr :3000
# taskkill /PID <PID> /F
```

### Issue: "TypeScript errors"

**Solution:**

```bash
# Run type check
npm run type-check

# Most errors are in components - check the file
# Usually related to missing type definitions or prop types
```

---

## Development Workflow

### Start Development

```bash
# Terminal 1: Frontend
cd v-ad-frontend
npm run dev
# Runs on http://localhost:3000

# Terminal 2: Backend
cd v-ad
npm run dev
# Runs on http://localhost:3000 (API at /api)

# Terminal 3: Video Worker
cd v-ad
npm run worker
```

### Create New Component

```bash
# Create file
touch src/components/MyComponent.tsx

# Add exports
export const MyComponent = () => {
  return <div>...</div>
}

# Use in page
import { MyComponent } from '@/components/MyComponent'
```

### Add New Page

```bash
# Create file in pages/
touch src/pages/mypage.tsx

# Auto-routed to /mypage
export default function MyPage() {
  return <div>...</div>
}
```

### Add Custom Hook

```bash
# Create file in hooks/
touch src/lib/hooks/useMyHook.ts

export const useMyHook = () => {
  // Custom logic
  return { data, isLoading }
}
```

---

## Testing the Application

### Test Signup/Login

1. Go to `http://localhost:3000`
2. Click "Sign up"
3. Create account with:
   - Name: Test User
   - Email: test@example.com
   - Password: password123
4. Should redirect to `/dashboard`

### Test Video Creation

1. Click "Create" in navigation
2. Upload a product image (JPG, PNG)
3. Fill form:
   - Business: E-commerce
   - Product: Test Product
   - Platform: Reels
   - Language: English
4. Click "Generate Script"
5. Should show AI-generated script
6. Click "Generate Video"
7. Wait 2-5 minutes for processing

### Test API Calls

Use the browser console:

```javascript
// Get auth token
const token = localStorage.getItem("auth_token");
console.log(token);

// Fetch script
fetch("http://localhost:3000/api/script/templates")
  .then((r) => r.json())
  .then(console.log);
```

---

## Performance Optimization

Already included:

- ✅ Code splitting by route
- ✅ Image optimization
- ✅ CSS minification
- ✅ Lazy loading
- ✅ SWC compiler

Additional tips:

- Use `npm run build` to check bundle size
- Monitor with `npm run dev` performance tab
- Consider React.memo for heavy components

---

## Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Update `NEXT_PUBLIC_API_URL` to production backend
- [ ] Enable CORS on backend for frontend domain
- [ ] Setup HTTPS
- [ ] Configure DNS
- [ ] Setup analytics
- [ ] Test all flows
- [ ] Monitor error logs

---

## Support & Resources

- **Next.js Docs**: https://nextjs.org/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Zustand**: https://github.com/pmndrs/zustand
- **React Hook Form**: https://react-hook-form.com/
- **Lucide Icons**: https://lucide.dev/

---

**Last Updated:** 2026-02-28
