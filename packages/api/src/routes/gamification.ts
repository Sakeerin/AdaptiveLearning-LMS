import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getUserGameStats,
  getUserAchievements,
  getLeaderboard,
  getUserRank,
  initializeUserGameStats
} from '../services/gamification.service';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/gamification/stats
 * Get current user's game stats (XP, level, points, streak)
 */
router.get('/stats', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  try {
    const userId = (req as any).user.id;

    const stats = await getUserGameStats(userId);

    logger.info(`Retrieved game stats for user ${userId} in ${Date.now() - startTime}ms`);
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/gamification/achievements
 * Get current user's earned achievements
 */
router.get('/achievements', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  try {
    const userId = (req as any).user.id;

    const achievements = await getUserAchievements(userId);

    logger.info(`Retrieved ${achievements.length} achievements for user ${userId} in ${Date.now() - startTime}ms`);
    res.json(achievements);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/gamification/leaderboard
 * Get leaderboard
 * Query params:
 *   - metric: 'xp' | 'points' | 'streak' (default: 'xp')
 *   - period: 'daily' | 'weekly' | 'monthly' | 'all-time' (default: 'all-time')
 *   - limit: number (default: 100, max: 500)
 *   - courseId: optional course filter
 */
router.get('/leaderboard', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  try {
    const metric = (req.query.metric as any) || 'xp';
    const period = (req.query.period as any) || 'all-time';
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const courseId = req.query.courseId as string;

    // Validate metric
    if (!['xp', 'points', 'streak'].includes(metric)) {
      throw new AppError('Invalid metric. Must be xp, points, or streak', 400);
    }

    // Validate period
    if (!['daily', 'weekly', 'monthly', 'all-time'].includes(period)) {
      throw new AppError('Invalid period. Must be daily, weekly, monthly, or all-time', 400);
    }

    const leaderboard = await getLeaderboard(metric, period, limit, courseId);

    logger.info(`Retrieved leaderboard (${metric}, ${period}) in ${Date.now() - startTime}ms`);
    res.json({
      metric,
      period,
      courseId: courseId || null,
      entries: leaderboard
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/gamification/rank
 * Get current user's rank in leaderboard
 * Query params:
 *   - metric: 'xp' | 'points' | 'streak' (default: 'xp')
 */
router.get('/rank', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  try {
    const userId = (req as any).user.id;
    const metric = (req.query.metric as any) || 'xp';

    // Validate metric
    if (!['xp', 'points', 'streak'].includes(metric)) {
      throw new AppError('Invalid metric. Must be xp, points, or streak', 400);
    }

    const rankInfo = await getUserRank(userId, metric);

    logger.info(`Retrieved rank for user ${userId} (${metric}) in ${Date.now() - startTime}ms`);
    res.json({
      metric,
      ...rankInfo
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/gamification/initialize
 * Initialize game stats for current user (idempotent)
 */
router.post('/initialize', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  try {
    const userId = (req as any).user.id;

    const stats = await initializeUserGameStats(userId);

    logger.info(`Initialized game stats for user ${userId} in ${Date.now() - startTime}ms`);
    res.status(201).json(stats);
  } catch (error) {
    next(error);
  }
});

export default router;
