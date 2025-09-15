import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pino from 'pino';

const logger = pino();

export const securityMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://telegram.org"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.openai.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: process.env.NODE_ENV === 'production' ? { maxAge: 15552000, includeSubDomains: true, preload: false } : false,
  referrerPolicy: { policy: 'no-referrer' }
});

const corsOrigin = process.env.ORIGIN || 'http://localhost:5173';
if (process.env.NODE_ENV !== 'production') logger.info({ corsOrigin }, 'CORS origin configured');

export const corsMiddleware = cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
});

export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: { code: 'RATE_LIMIT', message: 'Too many requests' } },
  standardHeaders: true,
  legacyHeaders: false
});

export const chatRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: { code: 'CHAT_RATE_LIMIT', message: 'Too many chat requests' } },
  standardHeaders: true,
  legacyHeaders: false
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: { code: 'AUTH_RATE_LIMIT', message: 'Too many authentication attempts' } },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

export const paymentsRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: { code: 'PAYMENTS_RATE_LIMIT', message: 'Too many payment requests' } },
  standardHeaders: true,
  legacyHeaders: false
});
