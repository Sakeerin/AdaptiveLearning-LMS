import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getUserNotifications,
  createNotification
} from '../services/notification.service';
import Notification from '../models/Notification';
import NotificationPreferences from '../models/NotificationPreferences';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/notifications
 * Get user's notifications
 *
 * Query params:
 *   - unreadOnly: boolean (default: false)
 *   - limit: number (default: 50, max: 100)
 *   - offset: number (default: 0)
 *   - type: notification type filter
 */
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  try {
    const userId = (req as any).user.id;
    const unreadOnly = req.query.unreadOnly === 'true';
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const type = req.query.type as string;

    const result = await getUserNotifications(userId, {
      unreadOnly,
      limit,
      offset,
      type
    });

    logger.info(`Retrieved ${result.notifications.length} notifications for user ${userId} in ${Date.now() - startTime}ms`);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/notifications/unread/count
 * Get unread notification count
 */
router.get('/unread/count', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  try {
    const userId = (req as any).user.id;

    const count = await (Notification as any).getUnreadCount(userId);

    logger.info(`Retrieved unread count for user ${userId}: ${count} in ${Date.now() - startTime}ms`);
    res.json({ count });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark notification as read
 */
router.put('/:id/read', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const notification = await (Notification as any).markAsRead(userId, id);

    if (!notification) {
      throw new AppError('Notification not found', 404);
    }

    logger.info(`Marked notification ${id} as read for user ${userId} in ${Date.now() - startTime}ms`);
    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
router.put('/read-all', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  try {
    const userId = (req as any).user.id;

    const result = await (Notification as any).markAllAsRead(userId);

    logger.info(`Marked all notifications as read for user ${userId} (${result.modifiedCount}) in ${Date.now() - startTime}ms`);
    res.json({
      message: 'All notifications marked as read',
      count: result.modifiedCount
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete notification
 */
router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const result = await Notification.findOneAndDelete({
      _id: id,
      userId
    });

    if (!result) {
      throw new AppError('Notification not found', 404);
    }

    logger.info(`Deleted notification ${id} for user ${userId} in ${Date.now() - startTime}ms`);
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/notifications/preferences
 * Get notification preferences
 */
router.get('/preferences', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  try {
    const userId = (req as any).user.id;

    const prefs = await (NotificationPreferences as any).getOrCreate(userId);

    logger.info(`Retrieved notification preferences for user ${userId} in ${Date.now() - startTime}ms`);
    res.json(prefs);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/notifications/preferences
 * Update notification preferences
 */
router.put('/preferences', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  try {
    const userId = (req as any).user.id;
    const updates = req.body;

    const prefs = await (NotificationPreferences as any).getOrCreate(userId);

    // Update preferences
    if (updates.channels) {
      Object.assign(prefs.channels, updates.channels);
    }

    if (updates.types) {
      Object.assign(prefs.types, updates.types);
    }

    if (updates.schedule) {
      Object.assign(prefs.schedule, updates.schedule);
    }

    await prefs.save();

    logger.info(`Updated notification preferences for user ${userId} in ${Date.now() - startTime}ms`);
    res.json(prefs);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/notifications/push-token
 * Register push notification token
 */
router.post('/push-token', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  try {
    const userId = (req as any).user.id;
    const { token, platform, deviceId } = req.body;

    if (!token || !platform || !deviceId) {
      throw new AppError('token, platform, and deviceId are required', 400);
    }

    if (!['ios', 'android', 'web'].includes(platform)) {
      throw new AppError('platform must be ios, android, or web', 400);
    }

    const prefs = await (NotificationPreferences as any).addPushToken(
      userId,
      token,
      platform,
      deviceId
    );

    logger.info(`Registered push token for user ${userId}, device ${deviceId} in ${Date.now() - startTime}ms`);
    res.json({ message: 'Push token registered successfully', prefs });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/notifications/push-token/:deviceId
 * Remove push notification token
 */
router.delete('/push-token/:deviceId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  try {
    const userId = (req as any).user.id;
    const { deviceId } = req.params;

    await (NotificationPreferences as any).removePushToken(userId, deviceId);

    logger.info(`Removed push token for user ${userId}, device ${deviceId} in ${Date.now() - startTime}ms`);
    res.json({ message: 'Push token removed successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
