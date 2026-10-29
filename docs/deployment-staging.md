# Staging Deployment Runbook

Goal: a reachable staging stack so the Vercel frontend serves live data and the
Gemini/Comtrade integrations can be verified with real keys. Three services,
deployed in this order:

1. **Database** — already done (Supabase Postgres, seeded).
2. **AI agent** (FastAPI, `backend/ai-agent`) — Railway or Render web service.
3. **Backend** (Express, `backend/`) — Railway or Render web service.
4. **Frontend** (Vercel, `frontend/`) — already deployed; only env var changes.

## Step 1: AI agent (Railway or Render)

- Root directory: `backend/ai-agent`
- Start command: `uvicorn app:app --host 0.0.0.0 --port $PORT`
  (check `backend/ai-agent/Dockerfile` / `docs/ai-agent.md` if a different
  entrypoint is configured)
- Environment variables:
  - `GOOGLE_API_KEY` — Gemini key (required for live AI features)
  - `COMTRADE_API_KEY` — UN Comtrade free-tier key (used by the agent's trade tools)
- Note the deployed URL, e.g. `https://globex-ai-agent.up.railway.app`.

## Step 2: Backend (Railway or Render)

- Root directory: `backend`
- Build: `npm install && npm run build` (or the service's default Node build)
- Start: `npm start` (`node dist/server.js`)
- Environment variables:
  - `DATABASE_URL` — Supabase pooler URL (port 6543)
  - `DIRECT_URL` — Supabase direct URL (port 5432, for migrations)
  - `JWT_SECRET` — `openssl rand -hex 32`
  - `JWT_REFRESH_SECRET` — `openssl rand -hex 32`
  - `GOOGLE_API_KEY` — same Gemini key
  - `COMTRADE_API_KEY` — same Comtrade key (note: the code reads
    `COMTRADE_API_KEY`, **not** `UN_COMTRADE_API_KEY`)
  - `AGENT_SERVICE_URL` — AI agent URL from Step 1, with `/api/v1` suffix
  - `ALLOWED_ORIGINS` — the Vercel frontend origin, e.g.
    `https://globex.vercel.app` (comma-separated if several)
  - `NODE_ENV=production`
- Note the deployed URL, e.g. `https://globex-api.up.railway.app`.

## Step 3: Frontend (Vercel)

- Project env var (Production):
  - `VITE_API_BASE_URL` — backend URL from Step 2, **no path, no trailing
    slash**, e.g. `https://globex-api.up.railway.app`
- Redeploy the frontend (env vars are baked in at build time).

## Step 4: Smoke checks (in order)

1. `curl https://<backend>/health` → 200.
2. `curl https://<backend>/api/v1/trade/markets?hs=62&year=2025` → real
   Comtrade rows with `meta.source: "UN Comtrade"`.
3. `curl -X POST https://<backend>/api/v1/trade/refresh` → **401** (auth
   required since Phase 1).
4. Open the Vercel site → sign in with the demo account → Market
   Intelligence shows real markets; Buyer Discovery and Copilot answer
   without console errors (these exercise `GOOGLE_API_KEY` end to end).

## Notes

- `NODE_BACKEND_URL` is only needed on the AI agent if it calls back into the
  Express backend (see `docs/ai-agent.md`); set it to the Step 2 URL.
- Refreshing trade data requires an ADMIN account (seed creates
  `admin@globex.ai`); call `/api/v1/auth/login` as admin, then
  `POST /api/v1/trade/refresh` with the Bearer token.
- Free Comtrade tier is ~500 calls/day; the backend caches for 24h and caps
  itself at 450.
