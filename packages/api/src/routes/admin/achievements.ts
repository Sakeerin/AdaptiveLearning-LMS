import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import Achievement from '../../models/Achievement';
import UserAchievement from '../../models/UserAchievement';
import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { Types } from 'mongoose';

const router = Router();

// All routes require admin authentication
router.use(authenticate);
router.use(requireRole(['admin', 'instructor']));

/**
 * GET /api/admin/achievements
 * Get all achievements
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  try {
    const { type, isActive } = req.query;

    const filter: any = {};
    if (type) {
      filter.type = type;
    }
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const achievements = await Achievement.find(filter).sort({ type: 1, 'criteria.threshold': 1 });

    logger.info(`Retrieved ${achievements.length} achievements in ${Date.now() - startTime}ms`);
    res.json(achievements);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/achievements/:id
 * Get achievement by ID
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid achievement ID', 400);
    }

    const achievement = await Achievement.findById(id);
    if (!achievement) {
      throw new AppError('Achievement not found', 404);
    }

    // Get statistics
    const earnedCount = await UserAchievement.countDocuments({ achievementId: new Types.ObjectId(id) });

    logger.info(`Retrieved achievement ${id} in ${Date.now() - startTime}ms`);
    res.json({
      ...achievement.toObject(),
      earnedCount
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/achievements
 * Create new achievement
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  try {
    const achievementData = req.body;

    // Validate required fields
    if (!achievementData.key || !achievementData.type || !achievementData.name || !achievementData.criteria) {
      throw new AppError('Missing required fields', 400);
    }

    // Check for duplicate key
    const existingAchievement = await Achievement.findOne({ key: achievementData.key });
    if (existingAchievement) {
      throw new AppError('Achievement with this key already exists', 400);
    }

    const achievement = new Achievement(achievementData);
    await achievement.save();

    logger.info(`Created achievement ${achievement.key} in ${Date.now() - startTime}ms`);
    res.status(201).json(achievement);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/achievements/:id
 * Update achievement
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid achievement ID', 400);
    }

    const achievement = await Achievement.findById(id);
    if (!achievement) {
      throw new AppError('Achievement not found', 404);
    }

    // Don't allow changing key if achievement has been earned
    if (updates.key && updates.key !== achievement.key) {
      const earnedCount = await UserAchievement.countDocuments({ achievementId: new Types.ObjectId(id) });
      if (earnedCount > 0) {
        throw new AppError('Cannot change key of achievement that has been earned', 400);
      }
    }

    Object.assign(achievement, updates);
    await achievement.save();

    logger.info(`Updated achievement ${id} in ${Date.now() - startTime}ms`);
    res.json(achievement);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/achievements/:id
 * Delete achievement (soft delete by setting isActive to false)
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid achievement ID', 400);
    }

    const achievement = await Achievement.findById(id);
    if (!achievement) {
      throw new AppError('Achievement not found', 404);
    }

    // Soft delete
    achievement.isActive = false;
    await achievement.save();

    logger.info(`Deleted (soft) achievement ${id} in ${Date.now() - startTime}ms`);
    res.json({ message: 'Achievement deactivated successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/achievements/:id/users
 * Get users who earned this achievement
 */
router.get('/:id/users', async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);
    const offset = parseInt(req.query.offset as string) || 0;

    if (!Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid achievement ID', 400);
    }

    const achievement = await Achievement.findById(id);
    if (!achievement) {
      throw new AppError('Achievement not found', 404);
    }

    const userAchievements = await UserAchievement.find({ achievementId: new Types.ObjectId(id) })
      .populate('userId', 'name email profilePicture')
      .sort({ earnedAt: -1 })
      .skip(offset)
      .limit(limit);

    const total = await UserAchievement.countDocuments({ achievementId: new Types.ObjectId(id) });

    logger.info(`Retrieved ${userAchievements.length} users for achievement ${id} in ${Date.now() - startTime}ms`);
    res.json({
      achievement,
      users: userAchievements.map(ua => ({
        user: ua.userId,
        earnedAt: ua.earnedAt,
        progress: ua.progress
      })),
      total,
      limit,
      offset
    });
  } catch (error) {
    next(error);
  }
});

export default router;
