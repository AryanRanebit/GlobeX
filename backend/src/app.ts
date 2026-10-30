import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env';
import { swaggerSpec } from './config/swagger';
import { logger } from './utils/logger';
import { errorHandler, notFound } from './middleware/error.middleware';

// ─── Module Routes ────────────────────────────────────────────────────────────
import { authRoutes } from './modules/auth/auth.routes';
import { productsRoutes } from './modules/products/products.routes';
import { marketRoutes } from './modules/market/market.routes';
import { buyersRoutes } from './modules/buyers/buyers.routes';
import { leadsRoutes } from './modules/leads/leads.routes';
import { outreachRoutes } from './modules/outreach/outreach.routes';
import { complianceRoutes } from './modules/compliance/compliance.routes';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes';
import { chatRoutes } from './modules/chat/chat.routes';
import { agentsRoutes } from './modules/agents/agents.routes';
import { tradeRoutes } from './modules/trade/trade.routes';
import { tariffRoutes } from './modules/tariff/tariff.routes';
import { historyRoutes } from './modules/history/history.routes';

export const createApp = () => {
  const app = express();

  // ─── Security Middleware ────────────────────────────────────────
  app.use(helmet());
  app.use(cors({
    origin: env.ALLOWED_ORIGINS.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }));

  // ─── Rate Limiting ──────────────────────────────────────────────
  const limiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please try again later.' },
  });

  // Stricter limiter for auth routes
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: env.NODE_ENV === 'development' ? 200 : 10,
    message: { success: false, message: 'Too many auth attempts. Please try again in 15 minutes.' },
  });

  app.use(limiter);

  // ─── Request Parsing ────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(compression());

  // ─── HTTP Logging ───────────────────────────────────────────────
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
    skip: () => env.NODE_ENV === 'test',
  }));

  // ─── Health Check ───────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({
      status: 'healthy',
      service: 'GlobeX AI API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    });
  });

  // ─── API Docs ───────────────────────────────────────────────────
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'GlobeX AI API Docs',
    customCss: '.swagger-ui .topbar { background-color: #1a1a2e; }',
  }));
  app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));

  // ─── API Routes ─────────────────────────────────────────────────
  const BASE = `/api/${env.API_VERSION}`;

  app.use(`${BASE}/auth`, authLimiter, authRoutes);
  app.use(`${BASE}/products`, productsRoutes);
  app.use(`${BASE}/market`, marketRoutes);
  app.use(`${BASE}/buyers`, buyersRoutes);
  app.use(`${BASE}/leads`, leadsRoutes);
  app.use(`${BASE}/outreach`, outreachRoutes);
  app.use(`${BASE}/compliance`, complianceRoutes);
  app.use(`${BASE}/dashboard`, dashboardRoutes);
  app.use(`${BASE}/chat`, chatRoutes);
  app.use(`${BASE}/agents`, agentsRoutes);
  app.use(`${BASE}/trade`, tradeRoutes);
  app.use(`${BASE}/tariff`, tariffRoutes);
  // Convenience alias for unversioned /api/trade
  app.use('/api/trade', tradeRoutes);
  app.use(`${BASE}/history`, historyRoutes);
  // Convenience alias for unversioned /api/history
  app.use('/api/history', historyRoutes);

  // ─── Error Handling ─────────────────────────────────────────────
  app.use(notFound);
  app.use(errorHandler);

  return app;
};
