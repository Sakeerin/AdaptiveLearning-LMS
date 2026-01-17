import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { logger } from '../utils/logger';

/**
 * Security configuration interface
 */
interface SecurityConfig {
  corsOrigins: string[];
  isDevelopment: boolean;
  trustProxy: boolean;
}

/**
 * Get security configuration from environment
 */
export function getSecurityConfig(): SecurityConfig {
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:3000'];

  return {
    corsOrigins,
    isDevelopment: process.env.NODE_ENV !== 'production',
    trustProxy: process.env.TRUST_PROXY === 'true'
  };
}

/**
 * Configure helmet for enhanced security headers
 */
export function configureHelmet(config: SecurityConfig) {
  return helmet({
    // Content Security Policy
    contentSecurityPolicy: config.isDevelopment ? false : {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", ...config.corsOrigins],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },

    // HTTP Strict Transport Security
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },

    // Prevent clickjacking
    frameguard: {
      action: 'deny'
    },

    // Prevent MIME type sniffing
    noSniff: true,

    // XSS Protection
    xssFilter: true,

    // Referrer Policy
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin'
    },

    // Hide X-Powered-By header
    hidePoweredBy: true,

    // DNS Prefetch Control
    dnsPrefetchControl: {
      allow: false
    },

    // IE No Open
    ieNoOpen: true,

    // Permitted Cross-Domain Policies
    permittedCrossDomainPolicies: {
      permittedPolicies: 'none'
    }
  });
}

/**
 * Configure CORS
 */
export function configureCors(config: SecurityConfig) {
  return cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) {
        return callback(null, true);
      }

      // Check if origin is allowed
      if (config.corsOrigins.includes(origin) || config.corsOrigins.includes('*')) {
        return callback(null, true);
      }

      // In development, allow localhost variants
      if (config.isDevelopment && origin.includes('localhost')) {
        return callback(null, true);
      }

      logger.warn('CORS blocked request from origin', { origin });
      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Trace-Id',
      'X-Device-Id',
      'Accept-Language'
    ],
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'X-Request-Id',
      'X-Response-Time'
    ],
    maxAge: 86400 // 24 hours
  });
}

/**
 * Request ID middleware
 */
export function requestId(req: Request, res: Response, next: NextFunction) {
  const id = req.headers['x-request-id'] as string ||
    req.headers['x-trace-id'] as string ||
    generateRequestId();

  req.headers['x-request-id'] = id;
  res.setHeader('X-Request-Id', id);

  next();
}

/**
 * Response time middleware
 */
export function responseTime(req: Request, res: Response, next: NextFunction) {
  const startTime = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(startTime);
    const time = diff[0] * 1000 + diff[1] / 1000000;
    res.setHeader('X-Response-Time', `${time.toFixed(2)}ms`);
  });

  next();
}

/**
 * Sanitize request body (basic XSS prevention)
 */
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  next();
}

function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

function sanitizeString(str: string): string {
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}

/**
 * SQL Injection prevention (for query parameters)
 */
export function preventSqlInjection(req: Request, res: Response, next: NextFunction) {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|FETCH|DECLARE|TRUNCATE)\b)/i,
    /(--|\bOR\b|\bAND\b)/i,
    /[';]/
  ];

  const checkValue = (value: any): boolean => {
    if (typeof value === 'string') {
      return sqlPatterns.some(pattern => pattern.test(value));
    }
    return false;
  };

  const checkObject = (obj: any): boolean => {
    if (typeof obj === 'string') {
      return checkValue(obj);
    }

    if (Array.isArray(obj)) {
      return obj.some(item => checkObject(item));
    }

    if (obj !== null && typeof obj === 'object') {
      return Object.values(obj).some(value => checkObject(value));
    }

    return false;
  };

  // Only check query parameters (body validation is handled by Zod)
  if (checkObject(req.query)) {
    logger.warn('Potential SQL injection attempt blocked', {
      ip: req.ip,
      path: req.path,
      query: req.query
    });

    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid characters in query parameters'
    });
  }

  next();
}

/**
 * Request size limiter
 */
export function requestSizeLimiter(maxSize: string = '10mb') {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    const maxBytes = parseSize(maxSize);

    if (contentLength > maxBytes) {
      logger.warn('Request size limit exceeded', {
        ip: req.ip,
        path: req.path,
        size: contentLength,
        maxSize: maxBytes
      });

      return res.status(413).json({
        error: 'Payload Too Large',
        message: `Request size exceeds limit of ${maxSize}`
      });
    }

    next();
  };
}

function parseSize(size: string): number {
  const match = size.match(/^(\d+)(kb|mb|gb)?$/i);
  if (!match) return 10 * 1024 * 1024; // Default 10MB

  const value = parseInt(match[1], 10);
  const unit = (match[2] || 'b').toLowerCase();

  switch (unit) {
    case 'kb': return value * 1024;
    case 'mb': return value * 1024 * 1024;
    case 'gb': return value * 1024 * 1024 * 1024;
    default: return value;
  }
}

/**
 * IP whitelist/blacklist middleware
 */
export function ipFilter(options: {
  whitelist?: string[];
  blacklist?: string[];
}) {
  const { whitelist = [], blacklist = [] } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || '';

    // Check blacklist first
    if (blacklist.length > 0 && blacklist.includes(ip)) {
      logger.warn('Blacklisted IP blocked', { ip, path: req.path });
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied'
      });
    }

    // If whitelist is set, only allow whitelisted IPs
    if (whitelist.length > 0 && !whitelist.includes(ip)) {
      logger.warn('Non-whitelisted IP blocked', { ip, path: req.path });
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied'
      });
    }

    next();
  };
}
