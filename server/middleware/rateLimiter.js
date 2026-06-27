import rateLimit from 'express-rate-limit';

// Rate limiter for Codeforces API routes (max 30 requests per minute per IP)
export const cfLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30,
  message: { error: 'Too many requests to Codeforces API proxy, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for Authentication routes (max 10 requests per 15 minutes per IP)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for expensive routes like Journey/Compare (max 20 requests per minute per IP)
export const expensiveLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20,
  message: { error: 'Too many expensive operations, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
