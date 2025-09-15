import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import pino from 'pino';
import { DatabaseService } from './services/database';
import { securityMiddleware, corsMiddleware, generalRateLimit } from './middleware/security';
import authRoutes from './routes/auth';
import chatRoutes from './routes/chat';
import userRoutes from './routes/user';
import paymentRoutes from './routes/payments';
import conversationsRoutes from './routes/conversations';

const app = express();
const trustProxy = process.env.TRUST_PROXY || 'loopback';
app.set('trust proxy', trustProxy);
const logger = pino();
const PORT = process.env.PORT || 8000;

app.use(securityMiddleware);
app.use(corsMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(generalRateLimit);

// Diagnostics: confirm OpenAI env is wired (safe, truncated)
(() => {
  if (process.env.NODE_ENV !== 'production') {
    const key = process.env.OPENAI_API_KEY || '';
    const model = process.env.OPENAI_MODEL || '';
    logger.info({ model, keyPresent: !!key }, 'OpenAI config (dev)');
  }
})();

// Basic env validation (strict in production or when ENFORCE_ENV=1)
(() => {
  const strict = process.env.NODE_ENV === 'production' || process.env.ENFORCE_ENV === '1';
  const errs: string[] = [];
  const warns: string[] = [];
  const has = (k: string) => !!process.env[k];
  if (!has('BOT_TOKEN')) errs.push('BOT_TOKEN missing');
  if (!has('JWT_SECRET')) errs.push('JWT_SECRET missing');
  else {
    const len = (process.env.JWT_SECRET || '').length;
    if (len < 16) warns.push('JWT_SECRET is weak (<16 chars)');
    if (strict && len < 32) errs.push('JWT_SECRET too short for production (<32 chars)');
  }
  if (!has('ORIGIN')) errs.push('ORIGIN missing');
  const useMock = process.env.OPENAI_USE_MOCK === '1';
  if (!useMock && !has('OPENAI_API_KEY')) errs.push('OPENAI_API_KEY missing (OPENAI_USE_MOCK!=1)');
  if (!has('WEBHOOK_SECRET')) warns.push('WEBHOOK_SECRET missing (payments webhook)');
  if (strict && errs.length) {
    logger.error({ errs }, 'Environment validation failed');
    process.exit(1);
  }
  if (errs.length) logger.warn({ errs }, 'Env warnings (non-strict)');
  if (warns.length) logger.warn({ warns }, 'Env suggestions');
})();

app.use((req, res, next) => {
  const requestId = Math.random().toString(36).substring(7);
  req.headers['x-request-id'] = requestId;
  logger.info({ 
    requestId, 
    method: req.method, 
    url: req.url, 
    origin: req.headers.origin,
    userAgent: req.headers['user-agent']
  }, 'Request received');
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/user', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/conversations', conversationsRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const requestId = req.headers['x-request-id'];
  logger.error({ requestId, error: error.message, stack: error.stack }, 'Unhandled error');
  
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred'
    }
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found'
    }
  });
});

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Server started');
  if (process.env.ALLOW_MOCK_AUTH !== '1') {
    DatabaseService.deleteUserCascade('123456789')
      .then(() => logger.info('Cleanup: removed mock user 123456789 (if existed)'))
      .catch(() => {});
  }
});

export default app;
