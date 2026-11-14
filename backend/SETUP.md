# GlobeX AI — Backend Setup Guide

## 📋 Prerequisites

- **Node.js** 18+ ([download](https://nodejs.org))
- **PostgreSQL** 14+ ([download](https://www.postgresql.org/download/) or use [Docker](https://docs.docker.com/compose/gettingstarted/))
- **Git**
- **npm** or **yarn**

---

## 🚀 Quick Start (5 minutes)

### 1. Extract & Install

```bash
# Extract the archive
tar -xzf globex-ai-backend-clean.tar.gz
cd globex-ai

# Install dependencies
npm install

# Generate Prisma Client
npx prisma generate
```

### 2. Configure Environment

```bash
# Copy example to .env
cp .env.example .env
```

Edit `.env`:

```env
NODE_ENV=development
PORT=3000
API_VERSION=v1

# PostgreSQL connection
DATABASE_URL=postgresql://postgres:password@localhost:5432/globex_ai

# JWT (generate random 32+ char strings)
JWT_SECRET=your-random-secret-key-min-32-characters-long-change-this
JWT_REFRESH_SECRET=another-random-secret-key-min-32-characters-change-this
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Optional AI keys (add when integrating real AI)
OPENAI_API_KEY=
GEMINI_API_KEY=
ANTHROPIC_API_KEY=
```

### 3. Database Setup

```bash
# Create migration
npx prisma migrate dev --name init

# Seed demo data
npm run db:seed

# (Optional) Open Prisma Studio to view DB
npm run db:studio
```

### 4. Start Server

```bash
npm run dev
```

Expected output:
```
╔══════════════════════════════════════════════════════╗
║           🌍  GlobeX AI — Backend Running            ║
╠══════════════════════════════════════════════════════╣
║  Environment : development                           ║
║  Port        : 3000                                  ║
║  API Base    : http://localhost:3000/api/v1          ║
║  API Docs    : http://localhost:3000/api-docs        ║
║  Health      : http://localhost:3000/health          ║
╚══════════════════════════════════════════════════════╝
```

---

## 🐘 PostgreSQL Setup

### Option A: Local Installation

```bash
# macOS
brew install postgresql@15
brew services start postgresql@15

# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql

# Create database
createdb globex_ai
```

### Option B: Docker (Recommended)

```bash
docker run -d \
  --name globex-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=globex_ai \
  -p 5432:5432 \
  postgres:15-alpine

# Verify connection
psql postgresql://postgres:password@localhost:5432/globex_ai
```

---

## 🔑 Generate JWT Secrets

```bash
# Linux/macOS
openssl rand -base64 32

# Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

Use these values in `.env`

---

## 📜 Available Scripts

```bash
npm run dev              # Start dev server with auto-reload
npm run build            # Build TypeScript → dist/
npm start                # Run production build
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run migrations
npm run db:push          # Push schema to DB (no migration)
npm run db:studio        # Open Prisma Studio UI
npm run db:seed          # Seed demo data
```

---

## 🧪 Test the API

### Health Check

```bash
curl http://localhost:3000/health
```

### Sign Up

```bash
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "Secure@123",
    "companyName": "Test Company",
    "companyType": "Manufacturer",
    "industry": "Food"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Secure@123"
  }'
```

Save the `accessToken` from response and use in other requests:

```bash
curl http://localhost:3000/api/v1/auth/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 📚 API Documentation

Visit: **http://localhost:3000/api-docs**

All endpoints documented with Swagger/OpenAPI 3.0

---

## 🤖 AI Agent Integration Guide

The backend is ready for AI integration. Each agent is stubbed with mock data.

### Current State

- **MarketResearchAgent** → Returns realistic mock market data
- **LeadScoringAgent** → Deterministic scoring based on buyer data
- **OutreachAgent** → Template-based email generation

### How to Plug in Real AI

#### Example: Replace MarketResearchAgent with OpenAI

1. **Install OpenAI SDK**
   ```bash
   npm install openai
   ```

2. **Edit** `src/modules/agents/MarketResearchAgent.ts`:
   ```typescript
   import OpenAI from 'openai';
   import { env } from '../../config/env';
   
   const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
   
   async analyze(input: MarketResearchInput): Promise<MarketResearchOutput> {
     const response = await client.chat.completions.create({
       model: 'gpt-4-turbo',
       messages: [{
         role: 'user',
         content: `Analyze export markets for: ${input.product}...`
       }],
       response_format: { type: 'json_object' },
     });
     return JSON.parse(response.choices[0].message.content!);
   }
   ```

3. **Set API key in .env**
   ```
   OPENAI_API_KEY=sk-...
   ```

4. **Restart server** → Uses real AI!

Same pattern for Gemini, Claude, or any LLM.

---

## 🏗️ Project Structure

```
globex-ai/
├── src/
│   ├── config/              # Configuration (DB, env, Swagger)
│   ├── middleware/          # Auth, validation, errors, logging
│   ├── modules/
│   │   ├── auth/            # Authentication & profiles
│   │   ├── products/        # Product registration
│   │   ├── market/          # Market intelligence
│   │   ├── buyers/          # Buyer discovery
│   │   ├── leads/           # Lead management
│   │   ├── outreach/        # AI-generated outreach
│   │   ├── compliance/      # Export compliance
│   │   ├── dashboard/       # Dashboard metrics
│   │   └── agents/          # AI agent integrations ⭐
│   ├── utils/               # Helpers (JWT, logging, response)
│   ├── types/               # TypeScript types
│   ├── app.ts               # Express app
│   └── server.ts            # Server entry point
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Demo data
├── .env.example             # Environment template
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔐 Security Best Practices

✅ **Implemented**:
- Helmet (secure headers)
- CORS (origin whitelist)
- Rate limiting (100 req/15min, 10 auth req/15min)
- JWT with refresh tokens
- Password hashing (bcrypt)
- Request validation (Zod)
- SQL injection protection (Prisma)
- HTTPS ready

⚠️ **For Production**:

```env
NODE_ENV=production
JWT_SECRET=<very-long-random-string>
JWT_REFRESH_SECRET=<very-long-random-string>
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
DATABASE_URL=postgresql://user:pass@prod-db:5432/globex_ai
```

---

## 🐛 Troubleshooting

### "Cannot find module '@prisma/client'"
```bash
npx prisma generate
npm install
```

### "database connection timeout"
```bash
# Check PostgreSQL is running
psql postgresql://postgres:password@localhost:5432/globex_ai

# Update DATABASE_URL in .env with correct credentials
```

### "Port 3000 already in use"
```bash
# Change PORT in .env or kill process
lsof -i :3000
kill -9 <PID>
```

### "JWT token expired"
Use `/api/v1/auth/refresh` endpoint with your `refreshToken`

---

## 📞 Support

- **Docs**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/health
- **Issues**: Check error logs in console or Prisma Studio

---

## 🎯 Next Steps

1. ✅ Start server (`npm run dev`)
2. ✅ Visit Swagger docs
3. ✅ Test auth endpoints (signup/login)
4. ✅ Plug in real AI agents
5. ✅ Build frontend with React/Vue/Next.js
6. ✅ Deploy to production

---

**Happy hacking! 🚀**
