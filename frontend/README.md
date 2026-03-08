# V-AD Frontend

**AI-powered video generation platform for Indian businesses** - Built with Next.js, React, and TypeScript.

## 🎯 Features

- ✅ Beautiful modern UI with Tailwind CSS
- ✅ Multi-step video creation workflow
- ✅ AI script generation with Bedrock integration
- ✅ Real-time job progress tracking
- ✅ Push notifications with react-hot-toast
- ✅ File upload with drag-and-drop
- ✅ Responsive design (mobile/tablet/desktop)
- ✅ Authentication with JWT
- ✅ State management with Zustand
- ✅ Type-safe with TypeScript

## 📦 Tech Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom (headless)
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod
- **Notifications**: React Hot Toast
- **File Upload**: React Dropzone

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18
- npm or yarn

### Installation

```bash
# Clone repo
cd v-ad-frontend

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local

# Configure API URL (update if backend is not on localhost:3000)
# NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Development

```bash
npm run dev
```

Server runs on `http://localhost:3000`

### Build for Production

```bash
npm run build
npm start
```

## 📁 Project Structure

```
src/
├── components/              # React components
│   ├── ui/                 # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Form.tsx
│   │   ├── Card.tsx
│   │   ├── Alert.tsx
│   ├── FileUpload.tsx      # File upload component
│   ├── Layout.tsx          # App layout wrapper
│
├── lib/                    # Utilities & helpers
│   ├── api.ts             # API client & types
│   ├── store/             # Zustand stores
│   │   ├── authStore.ts
│   │   └── videoStore.ts
│   └── hooks/             # Custom hooks
│       └── useAPI.ts
│
├── pages/                 # Next.js pages
│   ├── _app.tsx          # App wrapper
│   ├── _document.tsx     # HTML document
│   ├── index.tsx         # Landing page
│   ├── login.tsx         # Login page
│   ├── signup.tsx        # Signup page
│   ├── create.tsx        # Video creation (main flow)
│   └── dashboard.tsx     # User dashboard
│
├── styles/               # Global styles
│   └── globals.css
│
├── types/                # TypeScript types
│   └── index.ts
│
└── public/               # Static assets
```

## 🔑 Key Components

### Pages

**Landing Page** (`pages/index.tsx`)

- Hero section with CTA
- Features showcase
- Pricing preview
- Responsive design

**Authentication** (`pages/login.tsx` & `pages/signup.tsx`)

- JWT token management
- Error handling
- Form validation

**Video Creation** (`pages/create.tsx`) - **Main Feature**

- 5-step workflow:
  1. Upload product image
  2. Enter business details
  3. AI generates script
  4. Create video job
  5. Download video
- Real-time progress tracking
- Job status polling
- Video preview & download

**Dashboard** (`pages/dashboard.tsx`)

- User stats
- Recent videos
- Quick actions
- Upgrade CTA

### Components

**UI Components** (`components/ui/`)

- `Button.tsx` - Reusable button with variants
- `Form.tsx` - Input, Textarea, Select
- `Card.tsx` - Card layout with header/content/footer
- `Alert.tsx` - Alert messages with variants

**FileUpload** (`components/FileUpload.tsx`)

- Drag-and-drop support
- File validation
- Progress indication

**Layout** (`components/Layout.tsx`)

- Header with navigation
- Footer
- Auth protection
- Consistent styling

### Stores (Zustand)

**Auth Store** (`lib/store/authStore.ts`)

```typescript
(-login(email, password) -
  signup(email, password, name) -
  logout() -
  checkAuth() -
  user,
  token,
  isLoading,
  error);
```

**Video Store** (`lib/store/videoStore.ts`)

```typescript
-setScript(scriptId) -
  setImage(url, path) -
  setPlatform(platform) -
  updateJobStatus(status) -
  generatedVideoUrl;
```

### Hooks (`lib/hooks/useAPI.ts`)

```typescript
useGenerateScript(); // Generate AI script
useGenerateVideo(); // Create video job
useJobStatus(); // Poll job status
useUploadImage(); // Upload image to S3
useScriptTemplates(); // Get preset templates
useLanguages(); // Get language list
```

## 🎨 Styling

- **Tailwind CSS** for utility-first styling
- **Dark theme** by default (slate-900 background)
- **Gradient accents** (blue → cyan)
- **Responsive grid** system
- **Smooth animations** and transitions

## 🔐 Authentication

JWT-based authentication:

1. User signs up → Backend creates user & issues token
2. Token stored in `localStorage`
3. Token added to all API requests via interceptor
4. Auto-logout on 401 response
5. Protected routes redirect to `/login`

## 🌐 API Integration

All API calls go through `lib/api.ts`:

```typescript
// Script generation
const { script, scriptId } = await scriptAPI.generate({
  businessType: "E-commerce",
  productName: "Product Name",
  language: "hi",
  platform: "reels",
});

// Video generation
const { jobId } = await videoAPI.generate({
  scriptId,
  imagePath,
  platform: "reels",
  businessType,
  productName,
});

// Job status
const status = await jobAPI.getStatus(jobId);
// status.state: "queued" | "active" | "completed" | "failed"
// status.progress: 0-100
```

## 📱 Responsive Design

- **Mobile**: 100% width, optimized touch targets
- **Tablet**: 2 columns, readable text sizes
- **Desktop**: 3+ columns, full features
- **Dark mode**: Better for video editing focus

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Push to GitHub
git push origin main

# Vercel auto-deploys
# Set environment variables in Vercel dashboard:
NEXT_PUBLIC_API_URL=https://your-backend.com
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY .next ./next
EXPOSE 3000
CMD ["npm", "start"]
```

### Manual Deploy

```bash
npm run build
npm start
```

## 🔧 Environment Variables

```env
# Required
NEXT_PUBLIC_API_URL=http://localhost:3000

# Optional
NEXT_PUBLIC_GA_ID=your_analytics_id
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_WATERMARK=true
```

## 📊 Performance

- **Next.js Image Optimization** enabled
- **Code splitting** by route
- **CSS Minification** in production
- **JS Compression** with SWC
- **Lazy loading** of components
- **Optimized fonts** from Google Fonts

## 🐛 Debugging

```bash
# Development mode with hot reload
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format
```

## 🔗 API Endpoints Used

```
POST /api/auth/signup         - Create account
POST /api/auth/login          - Login
GET  /api/auth/profile        - Get user info

POST /api/script/generate     - Generate script
GET  /api/script/templates    - List templates
GET  /api/script/languages    - List languages

POST /api/video/generate      - Create video job
GET  /api/video/formats       - Video format info

GET  /api/job/:jobId/status   - Check job status
POST /api/job/:jobId/poll     - Poll with timeout

POST /api/upload/image        - Upload image
POST /api/upload/audio        - Upload audio
```

## 🎯 User Flow

1. **Landing** → Hero with CTA
2. **Auth** → Sign up / Login
3. **Dashboard** → See stats & recent videos
4. **Create** → 5-step workflow
   - Upload image
   - Enter business details
   - Generate AI script
   - Create video job
   - Download & share
5. **Share** → Download or social share

## 📈 Future Enhancements

- [ ] Video editor (trim, effects)
- [ ] Custom branding/watermark
- [ ] Bulk video generation
- [ ] Video templates library
- [ ] Collaboration features
- [ ] Advanced analytics
- [ ] Mobile native apps

## 📝 License

MIT - See LICENSE file

---

**Built with ❤️ for Indian Businesses by AiforBharat**
