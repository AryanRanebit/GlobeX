import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000').transform(Number),
  API_VERSION: z.string().default('v1'),

  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),

  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('4h'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),

  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('600').transform(Number),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  FEATHERLESS_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().default('Qwen/Qwen3-32B'),
  N8N_WEBHOOK_URL: z.string().url().optional(),

  // Python AI microservice
  AGENT_SERVICE_URL: z.string().url().default('http://localhost:8000/api/v1'),

  // ChromaDB vector store
  CHROMA_HOST: z.string().url().default('http://localhost:8001'),
  CHROMA_COLLECTION: z.string().default('globex_docs'),

  // UN Comtrade trade data
  COMTRADE_API_KEY: z.string().optional(),

  // Hunter.io contact finder (optional fallback for buyer email enrichment)
  HUNTER_API_KEY: z.string().optional(),
});

// Pre-process: convert empty strings to undefined so optional URL/string
// fields don't fail Zod validation when present-but-blank in .env
const rawEnv = Object.fromEntries(
  Object.entries(process.env).map(([k, v]) => [k, v === '' ? undefined : v]),
);

const _env = envSchema.safeParse(rawEnv);

if (!_env.success) {
  console.error('❌ Invalid environment variables:');
  console.error(_env.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = _env.data;
export type Env = typeof env;
