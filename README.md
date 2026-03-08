# v-ad

An AI-powered video generation platform for Indian businesses.

## Structure
This repository contains:
- `frontend/`: The React client (deployable on Vercel)
- `backend/`: The Node.js Express server with AWS Bedrock integrations (deployable on Render)

## Deployment

### Frontend (Vercel)
1. Import this repository to Vercel.
2. Under "Framework Preset", select `Vite`.
3. Set the **Root Directory** to `frontend`.
4. Add your Environment Variables (e.g. `VITE_API_URL`).
5. Deploy!

### Backend (Render)
1. Connect your GitHub account to Render.
2. Create a new "Blueprint" instance using the `render.yaml` file in the root.
3. Once created, go to the Environment section and map the secret environment variables (AWS Keys, S3 Bucket name, etc.).
4. The backend will automatically build from the `backend/` root directory.
