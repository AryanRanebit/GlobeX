# GlobeX AI — Production Deployment Guide

This guide details the complete deployment architecture for **GlobeX AI**, an enterprise-grade AI trade intelligence platform.

---

## 1. System Architecture

```
                                  ┌───────────────────────────┐
                                  │      Vercel / Netlify     │
                                  │   React 19 + Vite (SPA)   │
                                  └─────────────┬─────────────┘
                                                │ HTTPS
                                                ▼
                                  ┌───────────────────────────┐
                                  │   Railway / Render / VPS  │
                                  │  Express.js + TypeScript  │
                                  │   (API & Job Worker)      │
                                  └──────┬─────────────┬──────┘
                                         │             │
                    HTTP (Internal API)  │             │ Prisma ORM (Port 6543)
                                         ▼             ▼
                 ┌───────────────────────────┐    ┌───────────────────────────┐
                 │   Railway / Render / Fly  │    │     Supabase PostgreSQL   │
                 │   FastAPI Python Agent    │    │ (Direct 5432 / Pooler 6543)│
                 │   (Gemini + Trade Logic)  │    └───────────────────────────┘
                 └───────────────────────────┘
```

---

## 2. Environment Configuration Reference

### A. Frontend (`.env.production` on Vercel)

| Variable | Description | Example |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL of deployed Express backend | `https://api.yourdomain.com` |

> *Note: If `VITE_API_BASE_URL` is omitted, requests default to `/api/v1` (ideal when using a reverse-proxy or same-domain deployment).*

### B. Express Backend (`backend/.env`)

| Variable | Description | Example |
|---|---|---|
| `NODE_ENV` | Environment identifier | `production` |
| `PORT` | Listening port | `3000` |
| `DATABASE_URL` | Supabase Transaction Pooler URL (IPv4 / port 6543) | `postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `DIRECT_URL` | Supabase Direct Session URL (port 5432) | `postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:5432/postgres` |
| `JWT_SECRET` | 32+ character high-entropy key for access tokens | *(Generate with `openssl rand -hex 32`)* |
| `JWT_REFRESH_SECRET` | 32+ character high-entropy key for refresh tokens | *(Generate with `openssl rand -hex 32`)* |
| `JWT_EXPIRES_IN` | Access token lifespan | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifespan | `7d` |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed frontend domains | `https://globex-ai.vercel.app,http://localhost:5173` |
| `AGENT_SERVICE_URL` | URL of the deployed Python FastAPI service | `https://ai-agent.yourdomain.com/api/v1` |

### C. Python AI Agent (`backend/ai-agent/.env`)

| Variable | Description | Example |
|---|---|---|
| `GOOGLE_API_KEY` | Google Gemini API Key | `AIzaSy...` |
| `GEMINI_MODEL` | Gemini LLM Model | `gemini-2.5-flash-preview-05-20` |
| `APP_ENV` | Environment mode | `production` |
| `APP_PORT` | Listening port | `8000` |
| `CORS_ORIGINS` | JSON list of allowed callers | `["https://api.yourdomain.com", "http://localhost:3000"]` |

---

## 3. Step-by-Step Deployment Instructions

### Step 1: Database Setup (Supabase)
1. In your [Supabase Project Dashboard](https://supabase.com/dashboard), navigate to **Settings** → **Database**.
2. Copy the **Connection String** under **Transaction Pooler** (URI mode, port 6543). Set this as `DATABASE_URL`.
3. Copy the **Session Connection String** (port 5432). Set this as `DIRECT_URL`.
4. Apply the Prisma schema to the database:
   ```bash
   cd backend
   npx prisma db push
   ```

### Step 2: Deploy Python AI Agent (Railway / Render / Docker)
Deploy from the `backend/ai-agent` directory:
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app:app --host 0.0.0.0 --port 8000`
- **Health Check Path**: `/api/v1/health`

### Step 3: Deploy Express Backend (Railway / Render / Docker)
Deploy from the `backend` directory:
- **Build Command**: `npm ci && npm run build && npx prisma generate`
- **Start Command**: `node dist/server.js`
- **Health Check Path**: `/health`

> **Note on Background Worker**: The `ResearchJobWorker` automatically starts on server boot (`server.ts`). Running on a container or persistent VM (Railway/Render) ensures the polling queue operates continuously without interruption.

### Step 4: Deploy Frontend (Vercel)
1. Connect the Git repository to [Vercel](https://vercel.com).
2. Root Directory: `frontend` (or project root).
3. Framework Preset: **Vite**.
4. Configure Environment Variable:
   - `VITE_API_BASE_URL` = `https://your-express-backend.railway.app`
5. Click **Deploy**. Vercel will automatically apply `vercel.json` rewrites and caching.

---

## 4. Production Health Verification Checklist

- [x] **Frontend**: Vite production build succeeded (`dist/index.html` created)
- [x] **Backend**: TypeScript compiled with zero errors (`dist/server.js` generated)
- [x] **Database**: Prisma schema synchronized with Supabase PostgreSQL
- [x] **Integration Tests**: 74 / 74 backend tests passed (Auth, Market, Buyers, Jobs, Proxies)
- [x] **Python Service**: Unit tests passed; FastAPI service verified live on `/api/v1/health`
- [x] **Security & Integrity**: Expired token auto-clearing, dynamic heuristic fallbacks, and Vercel SPA routing configured
