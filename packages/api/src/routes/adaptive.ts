import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';
import { LearnerProgress } from '../models/LearnerProgress';
import {
  buildLearningPath,
  getNextLesson,
  getCourseCompletion,
  getRecommendedContent,
} from '../services/adaptive-engine.service';
import { Language, transformLesson } from '../services/bilingual-content.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/users/:userId/courses/:courseId/learning-path
 * Get personalized learning path for a course
 *
 * Query Parameters:
 * - language: 'th' | 'en' (default: 'en')
 */
router.get('/users/:userId/courses/:courseId/learning-path', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, courseId } = req.params;
    const language = (req.query.language as Language) || 'en';

    // Verify authorization
    if (req.user?.userId !== userId && req.user?.role !== 'admin') {
      throw new AppError('Unauthorized', 403);
    }

    logger.info('GET /api/users/:userId/courses/:courseId/learning-path', {
      userId,
      courseId,
      requesterId: req.user?.userId,
    });

    const learningPath = await buildLearningPath(userId, courseId);

    // Transform to requested language
    const transformedPath = learningPath.map(item => ({
      ...item,
      title: language === 'en' && item.title.en ? item.title.en : item.title.th,
      moduleName: language === 'en' && item.moduleName.en ? item.moduleName.en : item.moduleName.th,
      competencies: item.competencies.map(c => ({
        ...c,
        name: language === 'en' && c.name.en ? c.name.en : c.name.th,
      })),
    }));

    res.json({
      learningPath: transformedPath,
      total: transformedPath.length,
      userId,
      courseId,
      language,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/users/:userId/courses/:courseId/next-lesson
 * Get next recommended lesson
 *
 * Query Parameters:
 * - language: 'th' | 'en' (default: 'en')
 */
router.get('/users/:userId/courses/:courseId/next-lesson', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, courseId } = req.params;
    const language = (req.query.language as Language) || 'en';

    // Verify authorization
    if (req.user?.userId !== userId && req.user?.role !== 'admin') {
      throw new AppError('Unauthorized', 403);
    }

    logger.info('GET /api/users/:userId/courses/:courseId/next-lesson', {
      userId,
      courseId,
      requesterId: req.user?.userId,
    });

    const recommendation = await getNextLesson(userId, courseId);

    if (!recommendation) {
      return res.json({
        nextLesson: null,
        message: 'No lessons available. You may have completed the course or need to unlock prerequisites.',
      });
    }

    // Transform lesson
    const transformedLesson = transformLesson(recommendation.lesson.toObject(), language);

    res.json({
      nextLesson: {
        lesson: transformedLesson,
        reason: recommendation.reason,
        priority: recommendation.priority,
        competenciesToLearn: recommendation.competenciesToLearn,
        prerequisitesStatus: recommendation.prerequisitesStatus,
      },
      userId,
      courseId,
      language,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/users/:userId/lesson-progress
 * Update lesson progress
 *
 * Body:
 * {
 *   "lessonId": "...",
 *   "courseId": "...",
 *   "completionPercentage": 50,
 *   "timeSpent": 300000
 * }
 */
router.post('/users/:userId/lesson-progress', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const { lessonId, courseId, completionPercentage, timeSpent } = req.body;

    // Verify authorization
    if (req.user?.userId !== userId && req.user?.role !== 'admin') {
      throw new AppError('Unauthorized', 403);
    }

    logger.info('POST /api/users/:userId/lesson-progress', {
      userId,
      lessonId,
      completionPercentage,
      requesterId: req.user?.userId,
    });

    // Validate input
    if (!lessonId || !courseId) {
      throw new AppError('lessonId and courseId are required', 400);
    }

    if (completionPercentage === undefined || completionPercentage < 0 || completionPercentage > 100) {
      throw new AppError('completionPercentage must be between 0 and 100', 400);
    }

    if (!timeSpent || timeSpent < 0) {
      throw new AppError('timeSpent must be positive', 400);
    }

    // Update progress
    const progress = await LearnerProgress.updateProgress(
      userId,
      lessonId,
      courseId,
      completionPercentage,
      timeSpent
    );

    logger.info('Lesson progress updated', {
      userId,
      lessonId,
      status: progress.status,
      completionPercentage: progress.completionPercentage,
    });

    res.json({
      message: 'Progress updated successfully',
      progress: {
        lessonId: progress.lessonId,
        status: progress.status,
        completionPercentage: progress.completionPercentage,
        timeSpent: progress.timeSpent,
        lastAccessedAt: progress.lastAccessedAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/users/:userId/lessons/:lessonId/complete
 * Mark lesson as completed
 */
router.post('/users/:userId/lessons/:lessonId/complete', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, lessonId } = req.params;

    // Verify authorization
    if (req.user?.userId !== userId && req.user?.role !== 'admin') {
      throw new AppError('Unauthorized', 403);
    }

    logger.info('POST /api/users/:userId/lessons/:lessonId/complete', {
      userId,
      lessonId,
      requesterId: req.user?.userId,
    });

    const progress = await LearnerProgress.markCompleted(userId, lessonId);

    logger.info('Lesson marked as completed', {
      userId,
      lessonId,
      completedAt: progress.completedAt,
    });

    res.json({
      message: 'Lesson marked as completed',
      progress: {
        lessonId: progress.lessonId,
        status: progress.status,
        completedAt: progress.completedAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/users/:userId/courses/:courseId/completion
 * Get course completion statistics
 */
router.get('/users/:userId/courses/:courseId/completion', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, courseId } = req.params;

    // Verify authorization
    if (req.user?.userId !== userId && req.user?.role !== 'admin') {
      throw new AppError('Unauthorized', 403);
    }

    logger.info('GET /api/users/:userId/courses/:courseId/completion', {
      userId,
      courseId,
      requesterId: req.user?.userId,
    });

    const completion = await getCourseCompletion(userId, courseId);

    res.json({
      completion,
      userId,
      courseId,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/users/:userId/courses/:courseId/recommended-content
 * Get recommended content based on mastery
 *
 * Query Parameters:
 * - language: 'th' | 'en' (default: 'en')
 */
router.get('/users/:userId/courses/:courseId/recommended-content', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, courseId } = req.params;
    const language = (req.query.language as Language) || 'en';

    // Verify authorization
    if (req.user?.userId !== userId && req.user?.role !== 'admin') {
      throw new AppError('Unauthorized', 403);
    }

    logger.info('GET /api/users/:userId/courses/:courseId/recommended-content', {
      userId,
      courseId,
      requesterId: req.user?.userId,
    });

    const content = await getRecommendedContent(userId, courseId);

    // Transform to requested language
    const transformedContent = {
      nextLessons: content.nextLessons.map(item => ({
        ...item,
        title: language === 'en' && item.title.en ? item.title.en : item.title.th,
        moduleName: language === 'en' && item.moduleName.en ? item.moduleName.en : item.moduleName.th,
        competencies: item.competencies.map(c => ({
          ...c,
          name: language === 'en' && c.name.en ? c.name.en : c.name.th,
        })),
      })),
      reviewLessons: content.reviewLessons.map(item => ({
        ...item,
        title: language === 'en' && item.title.en ? item.title.en : item.title.th,
        moduleName: language === 'en' && item.moduleName.en ? item.moduleName.en : item.moduleName.th,
        competencies: item.competencies.map(c => ({
          ...c,
          name: language === 'en' && c.name.en ? c.name.en : c.name.th,
        })),
      })),
      recommendations: {
        nextCompetencies: content.recommendations.nextCompetencies.map(c => ({
          ...c,
          name: language === 'en' && c.name.en ? c.name.en : c.name.th,
        })),
        remediation: content.recommendations.remediation.map(c => ({
          ...c,
          name: language === 'en' && c.name.en ? c.name.en : c.name.th,
        })),
      },
    };

    res.json({
      content: transformedContent,
      userId,
      courseId,
      language,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/users/:userId/recent-activity
 * Get recent learning activity
 */
router.get('/users/:userId/recent-activity', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    // Verify authorization
    if (req.user?.userId !== userId && req.user?.role !== 'admin') {
      throw new AppError('Unauthorized', 403);
    }

    logger.info('GET /api/users/:userId/recent-activity', {
      userId,
      limit,
      requesterId: req.user?.userId,
    });

    const recentProgress = await LearnerProgress.find({ userId })
      .populate('lessonId')
      .populate('courseId')
      .sort({ lastAccessedAt: -1 })
      .limit(limit)
      .exec();

    const activity = recentProgress.map(p => ({
      lessonId: p.lessonId,
      courseId: p.courseId,
      status: p.status,
      completionPercentage: p.completionPercentage,
      timeSpent: p.timeSpent,
      lastAccessedAt: p.lastAccessedAt,
    }));

    res.json({
      activity,
      total: activity.length,
      userId,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
