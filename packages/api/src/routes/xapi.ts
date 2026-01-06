import { Router, Request, Response, NextFunction } from 'express';
import { XAPIStatement } from '../models/XAPIStatement';
import { validateXAPIStatement, validateBatch } from '../services/xapi-validation.service';
import { AppError } from '../middleware/error-handler';
import { optionalAuthenticate } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /xapi/statements
 * Store single or batch xAPI statements
 *
 * xAPI 1.0.3 Specification compliant
 * Supports idempotency, validation, and batch operations
 */
router.post('/statements', optionalAuthenticate, async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  try {
    const isBatch = Array.isArray(req.body);
    const statements = isBatch ? req.body : [req.body];

    logger.info('xAPI POST /statements', {
      count: statements.length,
      isBatch,
      userId: req.user?.userId,
      trace_id: req.headers['x-trace-id'],
    });

    // Validate statements
    if (isBatch) {
      const batchValidation = validateBatch(statements);

      if (!batchValidation.valid) {
        const invalidStatements = batchValidation.results.filter(r => !r.valid);

        logger.warn('xAPI batch validation failed', {
          count: statements.length,
          invalid: invalidStatements.length,
          errors: invalidStatements,
        });

        return res.status(400).json({
          error: 'Batch validation failed',
          details: invalidStatements,
        });
      }
    } else {
      // Single statement
      const validation = validateXAPIStatement(statements[0]);

      if (!validation.valid) {
        logger.warn('xAPI statement validation failed', {
          statementId: statements[0]?.id,
          errors: validation.errors,
        });

        return res.status(400).json({
          error: 'Statement validation failed',
          details: validation.errors,
        });
      }
    }

    // Store statements
    if (isBatch) {
      // Batch insert
      const batchResult = await XAPIStatement.createBatch(statements);

      const duplicates = batchResult.results.filter(r => r.duplicate);
      const created = batchResult.results.filter(r => !r.duplicate);
      const errors = batchResult.errors;

      const duration = Date.now() - startTime;

      logger.info('xAPI batch stored', {
        total: statements.length,
        created: created.length,
        duplicates: duplicates.length,
        errors: errors.length,
        duration,
      });

      // If some statements had errors, return 400
      if (errors.length > 0) {
        return res.status(400).json({
          message: 'Batch partially failed',
          created: created.length,
          duplicates: duplicates.length,
          errors: errors.length,
          details: errors,
        });
      }

      // If all were duplicates, return 409
      if (duplicates.length === statements.length) {
        return res.status(409).json({
          error: 'All statements are duplicates',
          duplicates: duplicates.map(d => d.statement.id),
        });
      }

      // Success (with some duplicates is ok)
      res.status(200).json({
        message: 'Batch stored successfully',
        created: created.length,
        duplicates: duplicates.length,
        statementIds: created.map(c => c.statement.id),
      });
    } else {
      // Single statement
      const result = await XAPIStatement.createStatement(statements[0]);

      const duration = Date.now() - startTime;

      if (result.duplicate) {
        logger.info('xAPI statement duplicate', {
          statementId: result.statement.id,
          duration,
        });

        return res.status(409).json({
          error: 'Statement already exists',
          statementId: result.statement.id,
        });
      }

      logger.info('xAPI statement stored', {
        statementId: result.statement.id,
        duration,
        actor: result.statement.actor.account?.name || result.statement.actor.mbox,
        verb: result.statement.verb.id,
      });

      res.status(200).json({
        message: 'Statement stored successfully',
        statementId: result.statement.id,
      });
    }
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('xAPI POST /statements failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
      trace_id: req.headers['x-trace-id'],
    });

    next(error);
  }
});

/**
 * GET /xapi/statements
 * Query statements with filters
 *
 * Query Parameters:
 * - actor: Actor identifier (account.name or mbox)
 * - verb: Verb ID (IRI)
 * - activity: Activity ID (object.id IRI)
 * - since: ISO 8601 datetime (statements after this time)
 * - until: ISO 8601 datetime (statements before this time)
 * - limit: Max statements to return (default 50, max 100)
 * - offset: Pagination offset (default 0)
 */
router.get('/statements', optionalAuthenticate, async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  try {
    const {
      actor,
      verb,
      activity,
      since,
      until,
      limit = '50',
      offset = '0',
    } = req.query;

    logger.info('xAPI GET /statements', {
      actor,
      verb,
      activity,
      since,
      until,
      limit,
      offset,
      userId: req.user?.userId,
      trace_id: req.headers['x-trace-id'],
    });

    // Validate parameters
    const filters: any = {};

    if (actor) {
      filters.actor = actor as string;
    }

    if (verb) {
      filters.verb = verb as string;
      // Validate verb is IRI
      try {
        new URL(filters.verb);
      } catch {
        return res.status(400).json({
          error: 'Invalid verb parameter',
          message: 'Verb must be a valid IRI/URL',
        });
      }
    }

    if (activity) {
      filters.activity = activity as string;
      // Validate activity is IRI
      try {
        new URL(filters.activity);
      } catch {
        return res.status(400).json({
          error: 'Invalid activity parameter',
          message: 'Activity must be a valid IRI/URL',
        });
      }
    }

    if (since) {
      filters.since = since as string;
      // Validate ISO 8601
      if (isNaN(new Date(filters.since).getTime())) {
        return res.status(400).json({
          error: 'Invalid since parameter',
          message: 'Since must be a valid ISO 8601 datetime',
        });
      }
    }

    if (until) {
      filters.until = until as string;
      // Validate ISO 8601
      if (isNaN(new Date(filters.until).getTime())) {
        return res.status(400).json({
          error: 'Invalid until parameter',
          message: 'Until must be a valid ISO 8601 datetime',
        });
      }
    }

    // Parse pagination
    const parsedLimit = parseInt(limit as string, 10);
    const parsedOffset = parseInt(offset as string, 10);

    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      return res.status(400).json({
        error: 'Invalid limit parameter',
        message: 'Limit must be between 1 and 100',
      });
    }

    if (isNaN(parsedOffset) || parsedOffset < 0) {
      return res.status(400).json({
        error: 'Invalid offset parameter',
        message: 'Offset must be a non-negative integer',
      });
    }

    filters.limit = parsedLimit;
    filters.offset = parsedOffset;

    // Query statements
    const result = await XAPIStatement.queryStatements(filters);

    const duration = Date.now() - startTime;

    logger.info('xAPI statements queried', {
      filters,
      returned: result.statements.length,
      total: result.total,
      duration,
    });

    // xAPI spec: return statements array
    res.status(200).json({
      statements: result.statements,
      more: result.hasMore ? `/xapi/statements?offset=${result.offset + result.limit}` : undefined,
      total: result.total,
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('xAPI GET /statements failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
      trace_id: req.headers['x-trace-id'],
    });

    next(error);
  }
});

/**
 * GET /xapi/activities/state
 * Optional MVP-lite endpoint for activity state
 *
 * This is a simplified version for MVP. Full xAPI state API has more features.
 */
router.get('/activities/state', optionalAuthenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { activityId, agent, stateId } = req.query;

    if (!activityId || !agent) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'activityId and agent are required',
      });
    }

    logger.info('xAPI GET /activities/state', {
      activityId,
      agent,
      stateId,
      userId: req.user?.userId,
    });

    // MVP: Return empty state (full implementation in v1.1)
    res.status(200).json({
      message: 'Activity state (MVP - simplified)',
      activityId,
      agent,
      stateId,
      state: {},
    });
  } catch (error) {
    next(error);
  }
});

export default router;
