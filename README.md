# 🌍 GlobeX — Export Market Intelligence Platform

**AI-driven trade intelligence and execution platform for Indian exporters, manufacturers, and MSMEs.**

[![React](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-blue.svg)](https://react.dev/)
[![Express](https://img.shields.io/badge/Backend-Express%20%2B%20TypeScript-yellow.svg)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/ORM-Prisma%205.10-black.svg)](https://www.prisma.io/)
[![FastAPI](https://img.shields.io/badge/AI%20Agent-FastAPI%20%2B%20LangChain-teal.svg)](https://fastapi.tiangolo.com/)
[![Gemini](https://img.shields.io/badge/LLM-Gemini%202.5%20Flash-orange.svg)](https://aistudio.google.com/)

---

## 📌 Overview

GlobeX empowers Indian businesses to expand globally by replacing expensive trade consulting and fragmented toolchains with an intelligent multi-agent platform. It provides verified international trade data from the **United Nations Comtrade (CY 2025)** database, surfaces high-potential export markets, manages buyer pipelines, and automates international buyer outreach.

### Key Capabilities
- **Verified Trade Data:** Sourced directly from UN Comtrade 2025 calendar-year merchandise exports for India (reporter code 699, across 223 partner markets).
- **Buyer Discovery & Scoring:** Filter and evaluate international buyers with algorithmic lead scores, revenue brackets, and import volume ratings.
- **AI Multi-Agent System:** Specialized agents for HS code classification, tariff/duty calculation, regulatory compliance checklists, and commercial document drafting.
- **Interactive 3D Visualizations:** Global trade corridor mapping powered by `react-globe.gl` and Three.js.
- **Enterprise Security:** Cryptographic JWT access/refresh token rotation, bcrypt password hashing, and Zod runtime schema validation.

---

## 🏗️ Architecture

```
                                  ┌───────────────────────────┐
                                  │   Frontend (React + Vite) │
                                  │   Port: 5173 (SPA Client) │
                                  └─────────────┬─────────────┘
                                                │ REST API / JWT
                                                ▼
                                  ┌───────────────────────────┐
                                  │ Express.js API + Worker   │
                                  │ Port: 3000 (TypeScript)   │
                                  └──────┬─────────────┬──────┘
                                         │             │
                HTTP / JSON (Port 8000)  │             │ Prisma ORM (Port 5432 / 6543)
                                         ▼             ▼
  ┌──────────────────────────────────────────┐    ┌───────────────────────────┐
  │ Python AI Agent (FastAPI / LangChain)    │    │ PostgreSQL Database       │
  │ - Gemini 2.5 Flash + Tool Calling        │    │ (Supabase / Local)        │
  │ - ChromaDB Vector Store (RAG)            │    │ 11 Relational Models      │
  │ - SQLite Session Memory (Async)          │    └───────────────────────────┘
  └──────────────────────────────────────────┘
```

Detailed component documentation:
- 📖 [**Backend Architecture & Modules (`docs/backend.md`)**](docs/backend.md)
- 📖 [**AI Agent System & RAG Pipeline (`docs/ai-agent.md`)**](docs/ai-agent.md)
- 📖 [**Production Deployment Guide (`docs/deployment.md`)**](docs/deployment.md)

---

## 📋 Prerequisites

Ensure your system has the following installed:
- **Node.js**: `v18.0.0` or higher (`node -v`)
- **npm**: `v9.0.0` or higher (`npm -v`)
- **Python**: `v3.10` or higher (`python --version`)
- **PostgreSQL**: PostgreSQL 15+ database instance (or a free [Supabase](https://supabase.com) project)
- **Google AI Studio API Key**: Required for Gemini agents ([aistudio.google.com](https://aistudio.google.com))

---

## 🚀 Setup & Local Execution

Clone the repository and follow the step-by-step instructions below.

### 1. Database Setup
Ensure your PostgreSQL instance is running. If using Supabase, obtain your transaction pooler URL (port `6543`) and direct connection URL (port `5432`).

### 2. Express Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your PostgreSQL credentials, JWT secret, and Google API key

# Generate Prisma client & apply database schema
npx prisma generate
npx prisma db push

# Seed database with sample buyers, products, and compliance rules
npm run db:seed

# (Optional) Provision default admin account
npx tsx scripts/create_default_user.ts

# Start the Express API server (port 3000)
npm run dev
```

- Health check: `http://localhost:3000/health`
- Swagger OpenAPI documentation: `http://localhost:3000/api-docs`

### 3. Python AI Agent Microservice Setup

Open a new terminal session:

```bash
cd backend/ai-agent

# Create and activate a Python virtual environment
python -m venv venv

# On Linux/macOS:
source venv/bin/activate
# On Windows (PowerShell):
venv\Scripts\Activate.ps1

# Install Python requirements
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Set GOOGLE_API_KEY=your_key_here

# Run the FastAPI agent service (port 8000)
python app.py
# Or directly via Uvicorn:
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

- Agent health check: `http://localhost:8000/api/v1/health`
- Interactive Swagger docs: `http://localhost:8000/docs`

### 4. React Frontend Setup

Open a third terminal session:

```bash
cd frontend

# Install frontend dependencies
npm install

# Start Vite development server (port 5173)
npm run dev
```

- Access application: `http://localhost:5173`
- Production build validation: `npm run build`

---

## 🔐 Environment Variables Reference

Below is the verified list of all configuration variables across each service. **Never commit real secret values to Git.**

| Variable | Service | Required? | Purpose | Example Placeholder |
|---|---|:---:|---|---|
| `PORT` | Backend | No | Listening port for Express API | `3000` |
| `NODE_ENV` | Backend | Yes | Execution environment mode | `development` |
| `DATABASE_URL` | Backend | Yes | PostgreSQL connection string | `postgresql://user:password@localhost:5432/globex_ai` |
| `DIRECT_URL` | Backend | No | Direct database session URL for migrations | `postgresql://user:password@localhost:5432/globex_ai` |
| `JWT_SECRET` | Backend | Yes | Secret used to sign user access tokens | `your-jwt-access-secret-32-chars-minimum` |
| `JWT_EXPIRES_IN` | Backend | No | Lifespan of access tokens | `15m` |
| `JWT_REFRESH_SECRET` | Backend | Yes | Secret used to sign refresh tokens | `your-jwt-refresh-secret-32-chars-minimum` |
| `JWT_REFRESH_EXPIRES_IN` | Backend | No | Lifespan of refresh tokens | `7d` |
| `ALLOWED_ORIGINS` | Backend | Yes | Comma-separated CORS allowed origins | `http://localhost:3000,http://localhost:5173` |
| `GOOGLE_API_KEY` | Backend & AI Agent | Yes | Google Gemini API key | `AIzaSy...your_gemini_api_key_here` |
| `GEMINI_MODEL` | Backend & AI Agent | No | Gemini model designation | `gemini-2.5-flash-preview-05-20` |
| `AGENT_SERVICE_URL` | Backend | Yes | URL of internal FastAPI agent service | `http://localhost:8000/api/v1` |
| `CHROMA_HOST` | Backend | No | Host URL for external ChromaDB service | `http://localhost:8001` |
| `CHROMA_COLLECTION` | Backend | No | Document indexing collection name | `globex_docs` |
| `RATE_LIMIT_WINDOW_MS` | Backend | No | Rate limit sliding window (ms) | `900000` |
| `RATE_LIMIT_MAX_REQUESTS`| Backend | No | Maximum requests permitted per window | `100` |
| `LOG_LEVEL` | Backend & AI Agent | No | Logging verbosity (`debug`, `info`, `warn`) | `info` |
| `APP_HOST` | AI Agent | No | Bind host for FastAPI server | `0.0.0.0` |
| `APP_PORT` | AI Agent | No | Port for FastAPI server | `8000` |
| `APP_ENV` | AI Agent | No | Application environment identifier | `development` |
| `DEBUG` | AI Agent | No | Toggle debug auto-reload | `true` |
| `CORS_ORIGINS` | AI Agent | No | JSON array of permitted caller URLs | `["http://localhost:3000","http://localhost:5173"]` |
| `CHROMA_PERSIST_DIR` | AI Agent | No | Local directory for vector embeddings | `./database/chroma_db` |
| `CHROMA_COLLECTION_NAME`| AI Agent | No | Local ChromaDB collection identifier | `globex_trade_knowledge` |
| `VITE_API_BASE_URL` | Frontend | No | Express backend base URL (if not proxied) | `http://localhost:3000` |

---

## 🧪 Verification & Testing Commands

To verify all components locally:

```bash
# Frontend Build Test
cd frontend && npm run build

# Backend TypeScript Typecheck & Build
cd backend && npm run build

# Prisma Schema Validation
cd backend && npx prisma validate

# AI Agent Import Check
cd backend/ai-agent && python -c "import app; print('AI Agent app loaded successfully')"
```

---

## 📜 License

This project is licensed under the MIT License.
