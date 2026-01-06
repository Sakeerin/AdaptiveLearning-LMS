import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, optionalAuthenticate } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';
import {
  getUserMastery,
  getCompetencyMastery,
  updateMasteryFromAssessment,
  applyMasteryDecay,
  buildSkillGraph,
  getRecommendations,
  getCourseProgress,
} from '../services/mastery-tracking.service';
import { Language, transformCompetency } from '../services/bilingual-content.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/users/:userId/mastery
 * Get all mastery records for a user
 *
 * Query Parameters:
 * - language: 'th' | 'en' (default: 'en')
 */
router.get('/users/:userId/mastery', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const language = (req.query.language as Language) || 'en';

    // Only allow users to view their own mastery (or admins)
    if (req.user?.userId !== userId && req.user?.role !== 'admin') {
      throw new AppError('Unauthorized', 403);
    }

    logger.info('GET /api/users/:userId/mastery', { userId, requesterId: req.user?.userId });

    const mastery = await getUserMastery(userId);

    // Transform competency names to requested language
    const transformedMastery = mastery.map(m => ({
      ...m,
      competencyName: language === 'en' && m.competencyName.en
        ? m.competencyName.en
        : m.competencyName.th,
    }));

    res.json({
      mastery: transformedMastery,
      total: transformedMastery.length,
      language,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/users/:userId/mastery/:competencyId
 * Get mastery for a specific competency
 *
 * Query Parameters:
 * - language: 'th' | 'en' (default: 'en')
 */
router.get('/users/:userId/mastery/:competencyId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, competencyId } = req.params;
    const language = (req.query.language as Language) || 'en';

    // Only allow users to view their own mastery (or admins)
    if (req.user?.userId !== userId && req.user?.role !== 'admin') {
      throw new AppError('Unauthorized', 403);
    }

    logger.info('GET /api/users/:userId/mastery/:competencyId', {
      userId,
      competencyId,
      requesterId: req.user?.userId,
    });

    const mastery = await getCompetencyMastery(userId, competencyId);

    if (!mastery) {
      return res.json({
        mastery: null,
        message: 'No mastery record found (not yet assessed)',
      });
    }

    // Transform competency name
    const transformedMastery = {
      ...mastery,
      competencyName: language === 'en' && mastery.competencyName.en
        ? mastery.competencyName.en
        : mastery.competencyName.th,
    };

    res.json({
      mastery: transformedMastery,
      language,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/users/:userId/mastery/:competencyId
 * Update mastery based on assessment performance
 *
 * Body:
 * {
 *   "correctness": 0.8,       // 0.0-1.0
 *   "timeOnTask": 300000,     // milliseconds
 *   "expectedTime": 600000,   // milliseconds
 *   "hintsUsed": 1,
 *   "attemptNumber": 1
 * }
 */
router.post('/users/:userId/mastery/:competencyId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, competencyId } = req.params;
    const { correctness, timeOnTask, expectedTime, hintsUsed, attemptNumber } = req.body;

    // Only allow users to update their own mastery (or admins)
    if (req.user?.userId !== userId && req.user?.role !== 'admin') {
      throw new AppError('Unauthorized', 403);
    }

    logger.info('POST /api/users/:userId/mastery/:competencyId', {
      userId,
      competencyId,
      correctness,
      requesterId: req.user?.userId,
    });

    // Validate input
    if (correctness === undefined || correctness < 0 || correctness > 1) {
      throw new AppError('correctness must be between 0 and 1', 400);
    }

    if (!timeOnTask || timeOnTask <= 0) {
      throw new AppError('timeOnTask must be positive', 400);
    }

    if (!expectedTime || expectedTime <= 0) {
      throw new AppError('expectedTime must be positive', 400);
    }

    // Get current mastery
    const currentMasteryRecord = await getCompetencyMastery(userId, competencyId);
    const currentMastery = currentMasteryRecord?.mastery || 0;
    const currentConfidence = currentMasteryRecord?.confidence || 0;

    // Update mastery
    const updatedMastery = await updateMasteryFromAssessment(userId, competencyId, {
      currentMastery,
      correctness,
      timeOnTask,
      expectedTime,
      hintsUsed: hintsUsed || 0,
      attemptNumber: attemptNumber || 1,
      currentConfidence,
    });

    res.json({
      message: 'Mastery updated successfully',
      mastery: updatedMastery,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/users/:userId/mastery/decay
 * Apply mastery decay for inactive user
 *
 * Body:
 * {
 *   "daysSinceLastAssessed": 7  // optional, default 7
 * }
 */
router.post('/users/:userId/mastery/decay', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const { daysSinceLastAssessed } = req.body;

    // Only allow users to decay their own mastery (or admins)
    if (req.user?.userId !== userId && req.user?.role !== 'admin') {
      throw new AppError('Unauthorized', 403);
    }

    logger.info('POST /api/users/:userId/mastery/decay', {
      userId,
      daysSinceLastAssessed: daysSinceLastAssessed || 7,
      requesterId: req.user?.userId,
    });

    await applyMasteryDecay(userId, daysSinceLastAssessed || 7);

    res.json({
      message: 'Mastery decay applied successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/courses/:courseId/skill-graph
 * Get skill graph for a course (with optional user mastery)
 *
 * Query Parameters:
 * - userId: User ID to include mastery data (optional)
 * - language: 'th' | 'en' (default: 'en')
 */
router.get('/courses/:courseId/skill-graph', optionalAuthenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId } = req.params;
    const userId = req.query.userId as string | undefined;
    const language = (req.query.language as Language) || 'en';

    logger.info('GET /api/courses/:courseId/skill-graph', {
      courseId,
      userId,
      requesterId: req.user?.userId,
    });

    // If userId is provided, verify authorization
    if (userId && req.user?.userId !== userId && req.user?.role !== 'admin') {
      throw new AppError('Unauthorized to view this user\'s mastery', 403);
    }

    const graph = await buildSkillGraph(courseId, userId);

    // Transform competency names to requested language
    const transformedGraph = graph.map(node => ({
      ...node,
      name: language === 'en' && node.name.en ? node.name.en : node.name.th,
    }));

    res.json({
      graph: transformedGraph,
      courseId,
      userId: userId || null,
      language,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/users/:userId/recommendations
 * Get recommended next competencies for a user
 *
 * Query Parameters:
 * - courseId: Course ID (required)
 * - language: 'th' | 'en' (default: 'en')
 */
router.get('/users/:userId/recommendations', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const courseId = req.query.courseId as string;
    const language = (req.query.language as Language) || 'en';

    // Only allow users to view their own recommendations (or admins)
    if (req.user?.userId !== userId && req.user?.role !== 'admin') {
      throw new AppError('Unauthorized', 403);
    }

    if (!courseId) {
      throw new AppError('courseId query parameter is required', 400);
    }

    logger.info('GET /api/users/:userId/recommendations', {
      userId,
      courseId,
      requesterId: req.user?.userId,
    });

    const recommendations = await getRecommendations(userId, courseId);

    // Transform competency names to requested language
    const transformedRecommendations = {
      nextCompetencies: recommendations.nextCompetencies.map(comp => ({
        ...comp,
        name: language === 'en' && comp.name.en ? comp.name.en : comp.name.th,
      })),
      remediation: recommendations.remediation.map(comp => ({
        ...comp,
        name: language === 'en' && comp.name.en ? comp.name.en : comp.name.th,
      })),
    };

    res.json({
      recommendations: transformedRecommendations,
      userId,
      courseId,
      language,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/users/:userId/courses/:courseId/progress
 * Get overall course progress for a user
 */
router.get('/users/:userId/courses/:courseId/progress', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, courseId } = req.params;

    // Only allow users to view their own progress (or admins)
    if (req.user?.userId !== userId && req.user?.role !== 'admin') {
      throw new AppError('Unauthorized', 403);
    }

    logger.info('GET /api/users/:userId/courses/:courseId/progress', {
      userId,
      courseId,
      requesterId: req.user?.userId,
    });

    const progress = await getCourseProgress(userId, courseId);

    res.json({
      progress,
      userId,
      courseId,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
