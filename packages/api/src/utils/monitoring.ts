import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

/**
 * Application metrics
 */
interface Metrics {
  requests: {
    total: number;
    success: number;
    errors: number;
    byMethod: Record<string, number>;
    byPath: Record<string, number>;
    byStatusCode: Record<number, number>;
  };
  performance: {
    avgResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
    responseTimes: number[];
  };
  system: {
    startTime: Date;
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
  };
}

// Global metrics store
const metrics: Metrics = {
  requests: {
    total: 0,
    success: 0,
    errors: 0,
    byMethod: {},
    byPath: {},
    byStatusCode: {}
  },
  performance: {
    avgResponseTime: 0,
    maxResponseTime: 0,
    minResponseTime: Infinity,
    responseTimes: []
  },
  system: {
    startTime: new Date(),
    uptime: 0,
    memoryUsage: process.memoryUsage()
  }
};

// Keep only last 1000 response times for memory efficiency
const MAX_RESPONSE_TIMES = 1000;

/**
 * Request logging and metrics middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = process.hrtime();
  const requestId = req.headers['x-request-id'] as string || 'unknown';

  // Log incoming request
  logger.info('Incoming request', {
    requestId,
    method: req.method,
    path: req.path,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: (req as any).user?.id
  });

  // Capture response
  res.on('finish', () => {
    const diff = process.hrtime(startTime);
    const responseTime = diff[0] * 1000 + diff[1] / 1000000;
    const statusCode = res.statusCode;

    // Update metrics
    updateMetrics(req, statusCode, responseTime);

    // Log response
    const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    logger[logLevel]('Request completed', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode,
      responseTime: `${responseTime.toFixed(2)}ms`,
      contentLength: res.get('Content-Length'),
      userId: (req as any).user?.id
    });
  });

  next();
}

/**
 * Update metrics with request data
 */
function updateMetrics(req: Request, statusCode: number, responseTime: number) {
  // Request counts
  metrics.requests.total++;

  if (statusCode >= 400) {
    metrics.requests.errors++;
  } else {
    metrics.requests.success++;
  }

  // By method
  const method = req.method;
  metrics.requests.byMethod[method] = (metrics.requests.byMethod[method] || 0) + 1;

  // By path (normalize dynamic segments)
  const normalizedPath = normalizePath(req.path);
  metrics.requests.byPath[normalizedPath] = (metrics.requests.byPath[normalizedPath] || 0) + 1;

  // By status code
  metrics.requests.byStatusCode[statusCode] = (metrics.requests.byStatusCode[statusCode] || 0) + 1;

  // Performance metrics
  metrics.performance.responseTimes.push(responseTime);

  if (metrics.performance.responseTimes.length > MAX_RESPONSE_TIMES) {
    metrics.performance.responseTimes.shift();
  }

  metrics.performance.maxResponseTime = Math.max(metrics.performance.maxResponseTime, responseTime);
  metrics.performance.minResponseTime = Math.min(metrics.performance.minResponseTime, responseTime);
  metrics.performance.avgResponseTime =
    metrics.performance.responseTimes.reduce((a, b) => a + b, 0) / metrics.performance.responseTimes.length;

  // System metrics
  metrics.system.uptime = (Date.now() - metrics.system.startTime.getTime()) / 1000;
  metrics.system.memoryUsage = process.memoryUsage();
}

/**
 * Normalize path for metrics (replace IDs with placeholders)
 */
function normalizePath(path: string): string {
  return path
    .replace(/\/[a-f\d]{24}/gi, '/:id')  // MongoDB ObjectIds
    .replace(/\/\d+/g, '/:id')            // Numeric IDs
    .replace(/\/[a-f\d-]{36}/gi, '/:uuid'); // UUIDs
}

/**
 * Get current metrics
 */
export function getMetrics(): Metrics {
  return {
    ...metrics,
    system: {
      ...metrics.system,
      uptime: (Date.now() - metrics.system.startTime.getTime()) / 1000,
      memoryUsage: process.memoryUsage()
    }
  };
}

/**
 * Get metrics summary
 */
export function getMetricsSummary() {
  const m = getMetrics();

  return {
    requests: {
      total: m.requests.total,
      success: m.requests.success,
      errors: m.requests.errors,
      successRate: m.requests.total > 0
        ? ((m.requests.success / m.requests.total) * 100).toFixed(2) + '%'
        : 'N/A'
    },
    performance: {
      avgResponseTime: m.performance.avgResponseTime.toFixed(2) + 'ms',
      maxResponseTime: m.performance.maxResponseTime.toFixed(2) + 'ms',
      minResponseTime: m.performance.minResponseTime === Infinity
        ? 'N/A'
        : m.performance.minResponseTime.toFixed(2) + 'ms'
    },
    system: {
      uptime: formatUptime(m.system.uptime),
      memoryUsed: formatBytes(m.system.memoryUsage.heapUsed),
      memoryTotal: formatBytes(m.system.memoryUsage.heapTotal),
      memoryRss: formatBytes(m.system.memoryUsage.rss)
    },
    topPaths: Object.entries(m.requests.byPath)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([path, count]) => ({ path, count })),
    statusCodes: m.requests.byStatusCode
  };
}

/**
 * Reset metrics
 */
export function resetMetrics() {
  metrics.requests = {
    total: 0,
    success: 0,
    errors: 0,
    byMethod: {},
    byPath: {},
    byStatusCode: {}
  };
  metrics.performance = {
    avgResponseTime: 0,
    maxResponseTime: 0,
    minResponseTime: Infinity,
    responseTimes: []
  };
  metrics.system.startTime = new Date();
}

/**
 * Format uptime in human-readable format
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * Format bytes in human-readable format
 */
function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let unitIndex = 0;
  let value = bytes;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Performance monitoring decorator
 */
export function measurePerformance(name: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const start = process.hrtime();

      try {
        const result = await originalMethod.apply(this, args);

        const diff = process.hrtime(start);
        const duration = diff[0] * 1000 + diff[1] / 1000000;

        logger.debug('Method performance', {
          name: `${name}.${propertyKey}`,
          duration: `${duration.toFixed(2)}ms`
        });

        return result;
      } catch (error) {
        const diff = process.hrtime(start);
        const duration = diff[0] * 1000 + diff[1] / 1000000;

        logger.error('Method failed', {
          name: `${name}.${propertyKey}`,
          duration: `${duration.toFixed(2)}ms`,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Database query monitoring
 */
export function logDatabaseQuery(operation: string, collection: string, query: any, duration: number) {
  if (duration > 100) {
    logger.warn('Slow database query', {
      operation,
      collection,
      query: JSON.stringify(query).substring(0, 200),
      duration: `${duration.toFixed(2)}ms`
    });
  } else {
    logger.debug('Database query', {
      operation,
      collection,
      duration: `${duration.toFixed(2)}ms`
    });
  }
}
