import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  keyGenerator?: (req: Request) => string;
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
  message?: string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store (for single server deployment)
// For production multi-server, use Redis
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

/**
 * Create rate limiter middleware
 */
export function createRateLimiter(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = defaultKeyGenerator,
    skipFailedRequests = false,
    skipSuccessfulRequests = false,
    message = 'Too many requests, please try again later'
  } = config;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    if (!entry || entry.resetTime < now) {
      // Create new entry
      entry = {
        count: 1,
        resetTime: now + windowMs
      };
      rateLimitStore.set(key, entry);
    } else {
      entry.count++;
    }

    // Set rate limit headers
    const remaining = Math.max(0, maxRequests - entry.count);
    const resetTime = Math.ceil(entry.resetTime / 1000);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetTime);

    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);

      logger.warn('Rate limit exceeded', {
        key,
        count: entry.count,
        maxRequests,
        ip: req.ip,
        path: req.path,
        method: req.method
      });

      return res.status(429).json({
        error: 'Too Many Requests',
        message,
        retryAfter
      });
    }

    // Handle skip options
    if (skipFailedRequests || skipSuccessfulRequests) {
      res.on('finish', () => {
        const statusCode = res.statusCode;
        const shouldSkip =
          (skipFailedRequests && statusCode >= 400) ||
          (skipSuccessfulRequests && statusCode < 400);

        if (shouldSkip && entry) {
          entry.count = Math.max(0, entry.count - 1);
        }
      });
    }

    next();
  };
}

/**
 * Default key generator - uses IP address
 */
function defaultKeyGenerator(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded
    ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0])
    : req.ip || req.socket.remoteAddress || 'unknown';

  return `rate_limit:${ip}`;
}

/**
 * Key generator for authenticated users
 */
export function userKeyGenerator(req: Request): string {
  const userId = (req as any).user?.id;
  if (userId) {
    return `rate_limit:user:${userId}`;
  }
  return defaultKeyGenerator(req);
}

/**
 * Key generator for specific endpoints
 */
export function endpointKeyGenerator(req: Request): string {
  const base = defaultKeyGenerator(req);
  return `${base}:${req.method}:${req.path}`;
}

// Pre-configured rate limiters

/**
 * General API rate limiter
 * 100 requests per minute
 */
export const generalRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
  message: 'Too many requests, please try again in a minute'
});

/**
 * Authentication rate limiter
 * 10 login attempts per 15 minutes
 */
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, please try again later'
});

/**
 * Strict rate limiter for sensitive operations
 * 5 requests per minute
 */
export const strictRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 5,
  message: 'Rate limit exceeded for this operation'
});

/**
 * Upload rate limiter
 * 10 uploads per hour
 */
export const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 10,
  keyGenerator: userKeyGenerator,
  message: 'Upload limit exceeded, please try again later'
});

/**
 * AI/Chat rate limiter
 * 30 requests per minute per user
 */
export const aiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  keyGenerator: userKeyGenerator,
  message: 'AI request limit exceeded, please wait a moment'
});

/**
 * Sync rate limiter
 * 20 sync requests per minute per device
 */
export const syncRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 20,
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id;
    const deviceId = req.body?.deviceId || req.query?.deviceId || 'unknown';
    return `rate_limit:sync:${userId}:${deviceId}`;
  },
  message: 'Sync rate limit exceeded, please wait before syncing again'
});
