import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Tracked error interface
 */
export interface TrackedError {
  id: string;
  timestamp: Date;
  severity: ErrorSeverity;
  message: string;
  stack?: string;
  code?: string;
  statusCode?: number;
  path?: string;
  method?: string;
  userId?: string;
  requestId?: string;
  metadata?: any;
}

// In-memory error store (for single server)
// For production, use external service (Sentry, DataDog, etc.)
const errorStore: TrackedError[] = [];
const MAX_STORED_ERRORS = 1000;

/**
 * Application error class
 */
export class AppError extends Error {
  statusCode: number;
  code: string;
  severity: ErrorSeverity;
  isOperational: boolean;
  metadata?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    metadata?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.severity = severity;
    this.isOperational = true;
    this.metadata = metadata;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Predefined error types
 */
export const Errors = {
  // Authentication errors
  UNAUTHORIZED: new AppError('Unauthorized', 401, 'UNAUTHORIZED', ErrorSeverity.LOW),
  FORBIDDEN: new AppError('Forbidden', 403, 'FORBIDDEN', ErrorSeverity.LOW),
  INVALID_TOKEN: new AppError('Invalid token', 401, 'INVALID_TOKEN', ErrorSeverity.LOW),
  TOKEN_EXPIRED: new AppError('Token expired', 401, 'TOKEN_EXPIRED', ErrorSeverity.LOW),

  // Validation errors
  VALIDATION_ERROR: (message: string) =>
    new AppError(message, 400, 'VALIDATION_ERROR', ErrorSeverity.LOW),
  INVALID_INPUT: (field: string) =>
    new AppError(`Invalid input: ${field}`, 400, 'INVALID_INPUT', ErrorSeverity.LOW),

  // Resource errors
  NOT_FOUND: (resource: string) =>
    new AppError(`${resource} not found`, 404, 'NOT_FOUND', ErrorSeverity.LOW),
  ALREADY_EXISTS: (resource: string) =>
    new AppError(`${resource} already exists`, 409, 'ALREADY_EXISTS', ErrorSeverity.LOW),
  CONFLICT: (message: string) =>
    new AppError(message, 409, 'CONFLICT', ErrorSeverity.MEDIUM),

  // Rate limiting
  RATE_LIMITED: new AppError(
    'Too many requests',
    429,
    'RATE_LIMITED',
    ErrorSeverity.LOW
  ),

  // Server errors
  INTERNAL_ERROR: new AppError(
    'Internal server error',
    500,
    'INTERNAL_ERROR',
    ErrorSeverity.HIGH
  ),
  DATABASE_ERROR: (message: string) =>
    new AppError(`Database error: ${message}`, 500, 'DATABASE_ERROR', ErrorSeverity.HIGH),
  EXTERNAL_SERVICE_ERROR: (service: string) =>
    new AppError(`External service error: ${service}`, 502, 'EXTERNAL_SERVICE_ERROR', ErrorSeverity.MEDIUM)
};

/**
 * Track an error
 */
export function trackError(
  error: Error | AppError,
  req?: Request,
  additionalMetadata?: any
): string {
  const id = generateErrorId();
  const timestamp = new Date();

  const trackedError: TrackedError = {
    id,
    timestamp,
    severity: (error as AppError).severity || determineSeverity(error),
    message: error.message,
    stack: error.stack,
    code: (error as AppError).code,
    statusCode: (error as AppError).statusCode,
    path: req?.path,
    method: req?.method,
    userId: (req as any)?.user?.id,
    requestId: req?.headers['x-request-id'] as string,
    metadata: {
      ...(error as AppError).metadata,
      ...additionalMetadata,
      userAgent: req?.headers['user-agent'],
      ip: req?.ip
    }
  };

  // Store error
  errorStore.push(trackedError);

  // Trim if too many
  if (errorStore.length > MAX_STORED_ERRORS) {
    errorStore.shift();
  }

  // Log based on severity
  const logMethod = trackedError.severity === ErrorSeverity.CRITICAL ? 'error' :
    trackedError.severity === ErrorSeverity.HIGH ? 'error' :
    trackedError.severity === ErrorSeverity.MEDIUM ? 'warn' : 'info';

  logger[logMethod]('Error tracked', {
    errorId: id,
    severity: trackedError.severity,
    message: trackedError.message,
    code: trackedError.code,
    statusCode: trackedError.statusCode,
    path: trackedError.path
  });

  // For critical errors, could trigger alerts here
  if (trackedError.severity === ErrorSeverity.CRITICAL) {
    triggerCriticalAlert(trackedError);
  }

  return id;
}

/**
 * Get tracked errors
 */
export function getTrackedErrors(options: {
  severity?: ErrorSeverity;
  limit?: number;
  since?: Date;
} = {}): TrackedError[] {
  let errors = [...errorStore];

  if (options.severity) {
    errors = errors.filter(e => e.severity === options.severity);
  }

  if (options.since) {
    errors = errors.filter(e => e.timestamp >= options.since);
  }

  errors.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  if (options.limit) {
    errors = errors.slice(0, options.limit);
  }

  return errors;
}

/**
 * Get error statistics
 */
export function getErrorStats(): {
  total: number;
  bySeverity: Record<ErrorSeverity, number>;
  byCode: Record<string, number>;
  recentErrors: TrackedError[];
} {
  const bySeverity: Record<ErrorSeverity, number> = {
    [ErrorSeverity.LOW]: 0,
    [ErrorSeverity.MEDIUM]: 0,
    [ErrorSeverity.HIGH]: 0,
    [ErrorSeverity.CRITICAL]: 0
  };

  const byCode: Record<string, number> = {};

  for (const error of errorStore) {
    bySeverity[error.severity]++;

    if (error.code) {
      byCode[error.code] = (byCode[error.code] || 0) + 1;
    }
  }

  return {
    total: errorStore.length,
    bySeverity,
    byCode,
    recentErrors: errorStore.slice(-10).reverse()
  };
}

/**
 * Clear error store
 */
export function clearErrors() {
  errorStore.length = 0;
}

/**
 * Determine error severity based on error type
 */
function determineSeverity(error: Error): ErrorSeverity {
  const message = error.message.toLowerCase();

  if (message.includes('database') || message.includes('connection')) {
    return ErrorSeverity.HIGH;
  }

  if (message.includes('timeout') || message.includes('memory')) {
    return ErrorSeverity.HIGH;
  }

  if (message.includes('authentication') || message.includes('authorization')) {
    return ErrorSeverity.LOW;
  }

  if (message.includes('validation') || message.includes('invalid')) {
    return ErrorSeverity.LOW;
  }

  return ErrorSeverity.MEDIUM;
}

/**
 * Generate unique error ID
 */
function generateErrorId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `err_${timestamp}_${random}`;
}

/**
 * Trigger alert for critical errors
 */
function triggerCriticalAlert(error: TrackedError) {
  // In production, this would:
  // - Send to PagerDuty, OpsGenie, etc.
  // - Send Slack/Teams notification
  // - Send email to on-call team

  logger.error('CRITICAL ERROR ALERT', {
    errorId: error.id,
    message: error.message,
    path: error.path,
    userId: error.userId,
    stack: error.stack
  });
}

/**
 * Global error handler middleware
 */
export function globalErrorHandler(
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Track the error
  const errorId = trackError(error, req);

  // Determine status code
  const statusCode = (error as AppError).statusCode || 500;
  const isOperational = (error as AppError).isOperational || false;

  // Prepare response
  const response: any = {
    error: statusCode >= 500 ? 'Internal Server Error' : 'Error',
    message: isOperational ? error.message : 'An unexpected error occurred',
    errorId,
    code: (error as AppError).code || 'UNKNOWN_ERROR'
  };

  // Include stack trace in development
  if (process.env.NODE_ENV !== 'production') {
    response.stack = error.stack;
  }

  // Add validation details if available
  if ((error as any).details) {
    response.details = (error as any).details;
  }

  res.status(statusCode).json(response);
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Not found handler
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  const error = new AppError(
    `Route not found: ${req.method} ${req.path}`,
    404,
    'ROUTE_NOT_FOUND',
    ErrorSeverity.LOW
  );

  next(error);
}
