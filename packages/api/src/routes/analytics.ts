import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  trackEvent,
  getUserAnalyticsSummary,
  getCourseAnalytics,
  getSystemAnalytics,
  getLearningInsights
} from '../services/analytics.service';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/analytics/events
 * Track analytics event
 */
router.post('/events', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const { eventType, eventCategory, eventData, sessionId, metadata } = req.body;

    if (!eventType || !eventCategory || !eventData) {
      throw new AppError('eventType, eventCategory, and eventData are required', 400);
    }

    if (!['engagement', 'performance', 'behavior', 'system'].includes(eventCategory)) {
      throw new AppError('Invalid eventCategory', 400);
    }

    await trackEvent(
      eventType,
      eventCategory,
      eventData,
      userId,
      sessionId,
      metadata
    );

    res.status(201).json({ message: 'Event tracked successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/users/:userId/summary
 * Get user analytics summary
 *
 * Query params:
 *   - startDate: ISO date string (default: 30 days ago)
 *   - endDate: ISO date string (default: now)
 */
router.get('/users/:userId/summary', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  try {
    const { userId } = req.params;
    const requestingUserId = (req as any).user.id;

    // Check authorization
    if (userId !== requestingUserId && (req as any).user.role !== 'admin') {
      throw new AppError('Unauthorized', 403);
    }

    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : new Date();

    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    const summary = await getUserAnalyticsSummary(userId, startDate, endDate);

    logger.info(`Retrieved analytics summary for user ${userId} in ${Date.now() - startTime}ms`);
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/users/:userId/insights
 * Get learning insights for user
 */
router.get('/users/:userId/insights', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  try {
    const { userId } = req.params;
    const requestingUserId = (req as any).user.id;

    // Check authorization
    if (userId !== requestingUserId && (req as any).user.role !== 'admin') {
      throw new AppError('Unauthorized', 403);
    }

    const insights = await getLearningInsights(userId);

    logger.info(`Retrieved learning insights for user ${userId} in ${Date.now() - startTime}ms`);
    res.json(insights);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/courses/:courseId
 * Get course analytics (admin only)
 *
 * Query params:
 *   - startDate: ISO date string (default: 30 days ago)
 *   - endDate: ISO date string (default: now)
 */
router.get('/courses/:courseId', authenticate, requireRole(['admin', 'instructor']), async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  try {
    const { courseId } = req.params;

    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : new Date();

    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const analytics = await getCourseAnalytics(courseId, startDate, endDate);

    logger.info(`Retrieved course analytics for ${courseId} in ${Date.now() - startTime}ms`);
    res.json(analytics);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/system
 * Get system analytics (admin only)
 *
 * Query params:
 *   - startDate: ISO date string (default: 7 days ago)
 *   - endDate: ISO date string (default: now)
 */
router.get('/system', authenticate, requireRole(['admin']), async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  try {
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : new Date();

    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

    const analytics = await getSystemAnalytics(startDate, endDate);

    logger.info(`Retrieved system analytics in ${Date.now() - startTime}ms`);
    res.json(analytics);
  } catch (error) {
    next(error);
  }
});

export default router;
