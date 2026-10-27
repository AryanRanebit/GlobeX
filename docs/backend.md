# 🌍 GlobeX AI — Backend API

**AI-powered Export Growth Platform for Indian Businesses**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18-yellow.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.10-black.svg)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🎯 What is GlobeX AI?

GlobeX AI is an **AI-powered Export Growth Team** helping Indian manufacturers, exporters, and MSMEs:

- ✅ **Discover** global buyers through intelligent matching
- ✅ **Analyze** export opportunities with market data
- ✅ **Manage** leads from discovery to conversion
- ✅ **Generate** personalized outreach emails
- ✅ **Understand** country-specific compliance requirements

---

## 🏗️ Architecture

- 📦 **Modular Design** — Service layer pattern + Repository pattern
- 🔒 **Enterprise Security** — JWT auth, rate limiting, helmet, CORS, Zod validation
- 🤖 **AI Agent Ready** — Pluggable architecture for OpenAI, Gemini, Claude, CrewAI
- 📊 **Full-Featured API** — 8+ modules, pagination, sorting, filtering
- 📚 **Auto-Docs** — Swagger/OpenAPI 3.0 documentation
- 💾 **Type-Safe Database** — Prisma ORM with PostgreSQL migrations
- 📝 **Audit Logging** — Track all user actions
- ⚡ **Production Optimized** — Compression, logging, error handling

---

## 🚀 Quick Start

```bash
cd backend
npm install

# Configure environment
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# Database initialization
npx prisma generate
npx prisma db push
npm run db:seed

# Start development server
npm run dev

# Swagger docs available at http://localhost:3000/api-docs
```

---

## 📂 Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma         # 11 models, relations, indexes
│   └── seed.ts               # Demo data (users, buyers, leads, compliance)
├── scripts/
│   └── create_default_user.ts# Creates default admin/exporter account
├── src/
│   ├── ai/                   # AI integrations & document indexing
│   ├── config/               # Database, env validation, Swagger config
│   ├── controllers/          # Request handlers
│   ├── middleware/           # Auth (JWT), validation (Zod), error handling
│   ├── routes/               # Express route declarations
│   ├── services/             # Business logic layer
│   ├── types/                # TypeScript interfaces and types
│   ├── utils/                # Logging (Winston), helpers
│   ├── app.ts                # Express app setup
│   └── server.ts             # Server entrypoint and worker boot
├── tsconfig.json
└── package.json
```

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js 18+ |
| **Language** | TypeScript 5.4 |
| **Framework** | Express.js 4.18 |
| **Database** | PostgreSQL 15+ (Hosted on Supabase or local) |
| **ORM** | Prisma 5.10 |
| **Auth** | JWT + refresh tokens, Google OAuth 2.0 |
| **Validation** | Zod schemas |
| **Security** | Helmet, CORS, express-rate-limit |
| **Docs** | Swagger / OpenAPI 3.0 (`swagger-ui-express`) |
| **Logging** | Winston, Morgan |

---

## 📦 Modules Overview

### 🔐 Auth Module
- User signup and login with JWT access and refresh tokens
- Password hashing with `bcryptjs` (12 rounds)
- Role-based access control (`ADMIN`, `USER`)
- Profile retrieval and update

### 📦 Products Module
- Register products for export
- HS code tracking and target country lists
- Certifications management (e.g. APEDA, FSSAI, ISO 22000)

### 🌍 Market Module
- AI-powered market opportunity analysis
- Demand scoring, growth rates, competition levels, market size estimates
- Asynchronous job execution with `ResearchJobWorker` and retry backoff

### 🏢 Buyers Module
- Verified global buyers directory
- Search by country, industry, and lead score
- Pagination, sorting, and detail views

### 📊 Leads Module
- Lead pipeline tracking (`NEW`, `CONTACTED`, `NEGOTIATION`, `WON`, `LOST`)
- Dynamic lead scoring and follow-up reminders

### 💌 Outreach Module
- AI-assisted outreach email generation
- Multi-tone and multi-language capability
- Outreach history logs

### ✅ Compliance Module
- Country-specific export regulatory requirements
- Pre-seeded data for USA, Germany, and UAE
- Document checklists, processing times, and cost estimates

---

## 🔐 Security Features

- **JWT Authentication**: Short-lived access tokens (`15m`) and secure refresh tokens (`7d`).
- **Input Validation**: Strict Zod schema parsing on all incoming payloads.
- **Rate Limiting**: Configurable request limits per window.
- **SQL Injection Prevention**: Parameterized queries via Prisma ORM.
- **CORS Whitelist**: Explicitly restricted to configured origin domains.
