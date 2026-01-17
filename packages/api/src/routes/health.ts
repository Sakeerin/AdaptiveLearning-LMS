import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { getMetricsSummary } from '../utils/monitoring';
import { logger } from '../utils/logger';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: CheckResult;
    memory: CheckResult;
    disk?: CheckResult;
  };
}

interface CheckResult {
  status: 'pass' | 'warn' | 'fail';
  message?: string;
  responseTime?: number;
  details?: any;
}

/**
 * GET /health
 * Basic health check - for load balancer
 */
router.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /health/live
 * Liveness probe - is the server running?
 */
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'live',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /health/ready
 * Readiness probe - is the server ready to accept traffic?
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    const checks = await performHealthChecks();
    const isReady = checks.database.status === 'pass' && checks.memory.status !== 'fail';

    const status: HealthStatus = {
      status: isReady ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.APP_VERSION || '1.0.0',
      checks
    };

    res.status(isReady ? 200 : 503).json(status);
  } catch (error) {
    logger.error('Health check failed:', error);

    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

/**
 * GET /health/detailed
 * Detailed health check with metrics - for monitoring
 */
router.get('/detailed', async (req: Request, res: Response) => {
  try {
    const checks = await performHealthChecks();
    const metrics = getMetricsSummary();

    const allPassing = Object.values(checks).every(check => check.status === 'pass');
    const anyFailing = Object.values(checks).some(check => check.status === 'fail');

    const status: HealthStatus & { metrics: any } = {
      status: anyFailing ? 'unhealthy' : allPassing ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.APP_VERSION || '1.0.0',
      checks,
      metrics
    };

    res.status(anyFailing ? 503 : 200).json(status);
  } catch (error) {
    logger.error('Detailed health check failed:', error);

    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

/**
 * GET /health/metrics
 * Prometheus-style metrics endpoint
 */
router.get('/metrics', (req: Request, res: Response) => {
  const metrics = getMetricsSummary();

  // Format as Prometheus metrics
  const lines = [
    '# HELP http_requests_total Total number of HTTP requests',
    '# TYPE http_requests_total counter',
    `http_requests_total ${metrics.requests.total}`,
    '',
    '# HELP http_requests_success Successful HTTP requests',
    '# TYPE http_requests_success counter',
    `http_requests_success ${metrics.requests.success}`,
    '',
    '# HELP http_requests_errors Failed HTTP requests',
    '# TYPE http_requests_errors counter',
    `http_requests_errors ${metrics.requests.errors}`,
    '',
    '# HELP http_response_time_avg Average response time in ms',
    '# TYPE http_response_time_avg gauge',
    `http_response_time_avg ${parseFloat(metrics.performance.avgResponseTime) || 0}`,
    '',
    '# HELP process_uptime_seconds Process uptime in seconds',
    '# TYPE process_uptime_seconds gauge',
    `process_uptime_seconds ${process.uptime()}`,
    '',
    '# HELP nodejs_heap_used_bytes Heap memory used',
    '# TYPE nodejs_heap_used_bytes gauge',
    `nodejs_heap_used_bytes ${process.memoryUsage().heapUsed}`,
    '',
    '# HELP nodejs_heap_total_bytes Total heap memory',
    '# TYPE nodejs_heap_total_bytes gauge',
    `nodejs_heap_total_bytes ${process.memoryUsage().heapTotal}`
  ];

  // Add status code metrics
  lines.push('');
  lines.push('# HELP http_requests_by_status HTTP requests by status code');
  lines.push('# TYPE http_requests_by_status counter');

  for (const [code, count] of Object.entries(metrics.statusCodes)) {
    lines.push(`http_requests_by_status{code="${code}"} ${count}`);
  }

  res.set('Content-Type', 'text/plain');
  res.send(lines.join('\n'));
});

/**
 * Perform all health checks
 */
async function performHealthChecks(): Promise<{
  database: CheckResult;
  memory: CheckResult;
}> {
  const [database, memory] = await Promise.all([
    checkDatabase(),
    checkMemory()
  ]);

  return { database, memory };
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<CheckResult> {
  const startTime = Date.now();

  try {
    const state = mongoose.connection.readyState;

    if (state !== 1) {
      return {
        status: 'fail',
        message: `Database not connected (state: ${getConnectionState(state)})`,
        responseTime: Date.now() - startTime
      };
    }

    // Perform a simple operation to verify connectivity
    await mongoose.connection.db?.admin().ping();

    const responseTime = Date.now() - startTime;

    return {
      status: responseTime > 1000 ? 'warn' : 'pass',
      message: responseTime > 1000 ? 'Database responding slowly' : 'Database connected',
      responseTime,
      details: {
        state: 'connected',
        host: mongoose.connection.host,
        name: mongoose.connection.name
      }
    };
  } catch (error) {
    return {
      status: 'fail',
      message: `Database check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      responseTime: Date.now() - startTime
    };
  }
}

/**
 * Check memory usage
 */
async function checkMemory(): Promise<CheckResult> {
  const memoryUsage = process.memoryUsage();
  const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
  const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
  const heapUsedPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

  // Warning at 80%, fail at 95%
  const status = heapUsedPercent > 95 ? 'fail' : heapUsedPercent > 80 ? 'warn' : 'pass';

  return {
    status,
    message: status === 'pass'
      ? 'Memory usage normal'
      : status === 'warn'
        ? 'Memory usage high'
        : 'Memory usage critical',
    details: {
      heapUsedMB: heapUsedMB.toFixed(2),
      heapTotalMB: heapTotalMB.toFixed(2),
      heapUsedPercent: heapUsedPercent.toFixed(2) + '%',
      rss: (memoryUsage.rss / 1024 / 1024).toFixed(2) + 'MB',
      external: (memoryUsage.external / 1024 / 1024).toFixed(2) + 'MB'
    }
  };
}

/**
 * Get connection state name
 */
function getConnectionState(state: number): string {
  switch (state) {
    case 0: return 'disconnected';
    case 1: return 'connected';
    case 2: return 'connecting';
    case 3: return 'disconnecting';
    default: return 'unknown';
  }
}

export default router;
