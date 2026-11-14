# GlobeX

AI-powered export intelligence for Indian exporters. GlobeX combines official UN Comtrade trade flows, market research, buyer prospect discovery, a leads CRM, and outreach drafts in a React dashboard.

This is a final-year project under active development, not a production trade-data or verified-buyer service. Features and limitations below describe this branch, not every open pull request.

## Data at a glance

The checked-in snapshot contains **India-reported merchandise exports for calendar year 2025**, sourced from UN Comtrade (UNSD), HS 2022 classification:

| Dataset | India exports to World (USD) | Destinations, excluding World |
| --- | ---: | ---: |
| All merchandise (`TOTAL`) | $445.8 billion | 223 |
| Apparel, not knitted or crocheted (`62`) | $8.39 billion | 196 |

The 421 seed records include a World aggregate in each dataset. Extraction date: 26 October 2026. See [`data/manifest.json`](data/manifest.json) and [`data/README.md`](data/README.md) for exact values, fields, and provenance. CSVs, JSON seed inputs, raw snapshots, and an update script live in [`data/`](data/).

Source: [UN Comtrade, United Nations Statistics Division](https://comtradeplus.un.org/).

## What works, and what is still a demo

- **Market rankings:** the Market Intelligence view reads the trade API, ranks destination countries by India-reported export value, and displays source, year, and provenance. The seeded scope is 2025 `TOTAL` and HS62, not all products or years.
- **Buyer discovery:** the Python agent runs Gemini with Google Search grounding and keeps only companies attributable to a real search-result citation; each returned buyer carries its source URL. The Express pipeline then deduplicates, evaluates evidence, applies heuristic scores, and persists results. Grounded companies are **prospects**, not verified importers: customs volumes, purchase history, and contacts are not claimed without evidence. If grounded search finds nothing credible, the pipeline returns an honest empty result or error — never fabricated companies (the mock provider exists in tests only). A score is not proof of purchasing activity.
- **Market research jobs:** authenticated requests create database-backed jobs. A worker starts with the Express server, processes research through the Python service, and supports status polling, retries, and saved opportunities. Research uses the available Comtrade scope; product/HS suggestions and qualitative commentary are not official classifications or forecasts.
- **Leads CRM API:** stores leads, pipeline stages, notes, and follow-up information. A full dashboard Kanban board is not implemented.
- **Outreach drafts:** generates and stores email subject/body drafts through the agent, with a template fallback. It does **not** deliver email. Review company claims, certifications, and contact details before using a draft.
- **Authentication:** email/password registration and sign-in, JWT access/refresh tokens, and an explicit demo-account button. A Google-token backend route exists, but Google sign-in is not wired into the frontend.
- **AI service and Copilot:** the dashboard Copilot sends authenticated chat requests to the Express chat API, which proxies them to the Gemini/LangChain agent. The agent has trade-data tools and a grounded-numbers rule: figures must come from tool results and cite UN Comtrade 2025, India-reported FOB; without tool data, it must say the figure is not available. If the agent cannot be reached, the Express API retains a labelled mock fallback; the Copilot shows an unavailable error instead of treating that fallback as an answer. Duty and rules outputs are indicative; verify them with a customs broker.

Other API modules cover products, compliance lookups, and dashboard summaries. Some dashboard content and seeded business records are demo data. The project does not promise live tariffs, verified company revenue/import volumes, or production-ready export advice.

## Architecture

```text
frontend/                 React 19 + Vite 8 + Tailwind CSS v4
    |                     localhost:5173; /api proxied to Express in development
    v
backend/                  Node.js + Express + TypeScript
    |                     localhost:3000; REST API, JWT auth, research worker
    +--> Prisma ----------> PostgreSQL (Supabase or local)
    |
    +--> backend/ai-agent/ Python FastAPI + LangChain + Gemini
                            localhost:8000; Chroma RAG + SQLite sessions
                            calls the Node trade API for market research
```

The Python RAG store is local/persistent by default; it does not require a separate Chroma server. The repository also contains a separate Node-side Chroma/Featherless integration, which is not required for the basic three-service flow below.

## Local setup

### Requirements

- Node.js **22.12+** and npm. The current Vite dependency requires Node `^20.19.0 || >=22.12.0`; Node 18 is not sufficient for the frontend.
- Python **3.11** is the agent Dockerfile's reference runtime, plus pip and venv.
- A PostgreSQL database, either local or on Supabase. Use a fresh development database for the commands below.
- A Google/Gemini API key for the Python agent, including its embedding calls. Comtrade API access is optional for the checked-in snapshot.

### 1. Clone this development branch

```bash
git clone --branch feat/comtrade-data-layer https://github.com/AryanRanebit/GlobeX.git
cd GlobeX
```

### 2. Configure the Express backend

```bash
cd backend
npm ci
cp .env.example .env
```

Edit `backend/.env`:

| Variable | Configuration |
| --- | --- |
| `DATABASE_URL` | PostgreSQL URL for the API. For Supabase, use the connection string supplied by your project. |
| `DIRECT_URL` | Direct/session database connection for Prisma schema operations. Set this explicitly: the Prisma schema references it even though runtime validation makes it optional. For local PostgreSQL, use the same URL as `DATABASE_URL`. |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Separate random secrets of at least 32 characters. Replace the example values. |
| `ALLOWED_ORIGINS` | Include `http://localhost:5173` for local frontend access. |
| `AGENT_SERVICE_URL` | `http://localhost:8000/api/v1` |
| `COMTRADE_API_KEY` | Optional. Leave blank to use seeded trade data; needed for authenticated upstream refreshes. |

Keep the remaining development defaults unless changing ports. Never commit `.env` files or real keys. The Python service reads its own `.env`; setting a Gemini key only in the backend file does not configure the agent.

### 3. Create the schema and seed trade data

From `backend/`, against a **fresh development database**:

```bash
npx prisma generate
npx prisma migrate dev --name init
npm run seed:comtrade
```

`seed:comtrade` runs `prisma/seed_comtrade.ts`, reads the checked-in JSON files, and upserts trade flows and cached queries. It does not require a Comtrade API key.

Migration layout matters: this repository has SQL migrations under [`supabase/migrations/`](supabase/migrations/), but no committed `backend/prisma/migrations/` history. `prisma migrate dev` creates a local Prisma migration from the current schema; it requires a development connection with shadow-database privileges. It is **not** a production deployment instruction. If your Supabase database is already provisioned by the SQL migrations, do not reset it or blindly run an initial migration. Reconcile/baseline that schema first. For a disposable development database where migration history is unnecessary, the existing `npm run db:push` script is an alternative.

Optional local-demo seed:

```bash
npm run db:seed
```

This adds sample users, products, and other business records for demonstrations, including the account used by the explicit demo-login button. Those are **test fixtures, not verified business evidence**. No buyers are seeded: buyer records are created only by the grounded discovery pipeline, so the buyer registry starts empty and honest. This seed creates fixed-password test accounts and must not be used unchanged in production; it is separate from the upsert-based Comtrade seed.

### 4. Configure and run the Python agent

In a new terminal, from the repository root:

```bash
cd backend/ai-agent
python3 -m venv .venv
source .venv/bin/activate
# Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env
```

Edit `backend/ai-agent/.env`:

```dotenv
GOOGLE_API_KEY=replace_with_your_google_ai_key
NODE_BACKEND_URL=http://localhost:3000
```

The agent reads **`GOOGLE_API_KEY`**, not `GEMINI_API_KEY`. Retain its SQLite `DATABASE_URL`; do not copy the backend PostgreSQL URL into this file. `NODE_BACKEND_URL` is read directly by the market-research route and can be added even though it is absent from the example file.

The default is `GEMINI_MODEL=gemini-3.6-flash`, a stable model ID listed in Google's Gemini API documentation: https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash. RAG also requests `models/text-embedding-004`; access to that embedding model is needed when seeding the knowledge base.

```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

The first startup initializes SQLite and seeds the local Chroma knowledge base using Google embeddings, so a usable key and network access are needed. The seeded Node trade API can run independently if the AI service is unavailable.

### 5. Start the API and frontend

In another terminal, from the repository root:

```bash
cd backend
npm run dev
```

In a third terminal, from the repository root:

```bash
cd frontend
npm ci
npm run dev
```

Open **http://localhost:5173**. The root `npm run dev` script starts only the frontend, not all three services. Vite's development proxy forwards `/api` to port 3000. Components that read `VITE_API_BASE_URL` expect an API prefix such as `http://localhost:3000/api/v1`, not just a hostname; local proxy use needs no frontend `.env`.

### Service checks and builds

| Service | Local endpoint |
| --- | --- |
| Express health | http://localhost:3000/health |
| Express Swagger UI | http://localhost:3000/api-docs |
| Seeded apparel rankings | http://localhost:3000/api/v1/trade/markets?hs=62&year=2025&limit=5 |
| All-goods rankings | http://localhost:3000/api/v1/trade/markets?hs=TOTAL&year=2025&limit=5 |
| Agent health | http://localhost:8000/api/v1/health |
| Agent Swagger UI | http://localhost:8000/docs |

The trade markets endpoint is public; CRM, research, and chat routes require authentication. After seeding, apparel rankings should report 196 destination markets and a World total of about $8.39 billion, with UN Comtrade attribution and `origin: seed`.

From the repository root:

```bash
npm --prefix frontend run build
npm --prefix backend run build
cd backend
npx prisma validate
npx vitest run
```

Backend tests include database/integration workflows. Configure an isolated test database and any required services before running them; do not point tests at production. These commands are checks to run locally, not a claim that a fresh clone has passed live end-to-end validation.

## Data honesty and limits

- **India-reported exports are not destination market size.** Export values are India's reported FOB flows to a destination, not that destination's total global imports.
- Destination market size uses destination-reported imports from World (CIF) when present. India's share of that destination uses destination-reported imports from India divided by imports from World. The seed contains neither import series, so these fields show **"Not available from free data"**, not invented values.
- A destination's share of **India's exports** is a different metric and can be calculated from the seeded World export total.
- **UN Comtrade does not supply company-level buyer records.** Buyer prospects come from grounded live web search with cited sources; their websites, contact details, heuristic scores, and any AI commentary must not be presented as customs-verified company data.
- One annual snapshot cannot establish multi-year growth, predictive model accuracy, or tariff/compliance validity. HS suggestions, duties, regulations, and generated documents need independent checks before commercial use.
- Chroma's trade knowledge documents provide retrieval context, not a live official rules feed. The backend mock fallback is not a source for trade figures.

## Roadmap

- Deploy and configure the backend and Python service with reliable health checks and production migration handling.
- Add reviewed outreach email delivery, rather than draft generation only.
- Extend official data coverage across years and HS codes, including destination-reported imports.
- Add independent company/contact/importer evidence on top of the grounded buyer search (e.g. a corporate registry provider).
- Build a frontend CRM pipeline view and expand automated frontend and end-to-end checks.

## Repository guide

- [`frontend/`](frontend/): landing page and dashboard.
- [`backend/src/`](backend/src/): Express modules, worker, middleware, and API configuration.
- [`backend/prisma/`](backend/prisma/): database schema and seeds.
- [`backend/ai-agent/`](backend/ai-agent/): Python agent, tools, prompts, RAG, and memory.
- [`data/`](data/): official snapshot, manifest, and update script.
- [`supabase/migrations/`](supabase/migrations/): checked-in SQL schema migrations.
- [`docs/`](docs/): supporting backend, agent, and deployment notes. Some older notes may describe planned integrations; use the current source and environment examples as the implementation reference.
