import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import {
  processSyncRequest,
  pullChanges,
  getSyncStatus,
  resolveConflict,
  cleanupSyncQueue
} from '../services/sync.service';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/sync/push
 * Push local changes to server
 *
 * Body:
 * {
 *   "deviceId": "...",
 *   "deviceName": "iPhone 12",
 *   "items": [
 *     {
 *       "id": "local-id-1",
 *       "operation": "create",
 *       "resourceType": "lesson_progress",
 *       "data": { ... },
 *       "clientTimestamp": "2024-01-08T10:30:00.000Z"
 *     }
 *   ],
 *   "metadata": {
 *     "appVersion": "1.0.0",
 *     "platform": "ios",
 *     "networkType": "wifi"
 *   }
 * }
 */
router.post('/push', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  try {
    const userId = (req as any).user.id;
    const syncRequest = req.body;

    // Validate request
    if (!syncRequest.deviceId) {
      throw new AppError('deviceId is required', 400);
    }

    if (!Array.isArray(syncRequest.items)) {
      throw new AppError('items must be an array', 400);
    }

    // Validate each item
    for (const item of syncRequest.items) {
      if (!item.operation || !item.resourceType || !item.data || !item.clientTimestamp) {
        throw new AppError('Each item must have operation, resourceType, data, and clientTimestamp', 400);
      }

      if (!['create', 'update', 'delete'].includes(item.operation)) {
        throw new AppError('Invalid operation. Must be create, update, or delete', 400);
      }

      const validResourceTypes = ['lesson_progress', 'quiz_attempt', 'xapi_statement', 'conversation', 'mastery'];
      if (!validResourceTypes.includes(item.resourceType)) {
        throw new AppError(`Invalid resourceType. Must be one of: ${validResourceTypes.join(', ')}`, 400);
      }
    }

    const response = await processSyncRequest(userId, syncRequest);

    logger.info(`Sync push completed for user ${userId} in ${Date.now() - startTime}ms`);
    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/sync/pull
 * Pull server changes since last sync
 *
 * Body:
 * {
 *   "deviceId": "...",
 *   "lastSyncVersion": 42,
 *   "resourceTypes": ["lesson_progress", "quiz_attempt"]
 * }
 */
router.post('/pull', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  try {
    const userId = (req as any).user.id;
    const pullRequest = req.body;

    // Validate request
    if (!pullRequest.deviceId) {
      throw new AppError('deviceId is required', 400);
    }

    if (pullRequest.lastSyncVersion === undefined) {
      throw new AppError('lastSyncVersion is required', 400);
    }

    const response = await pullChanges(userId, pullRequest);

    logger.info(`Sync pull completed for user ${userId} in ${Date.now() - startTime}ms`);
    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sync/status
 * Get sync status for user
 *
 * Query params:
 *   - deviceId: optional device filter
 */
router.get('/status', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  try {
    const userId = (req as any).user.id;
    const deviceId = req.query.deviceId as string;

    const status = await getSyncStatus(userId, deviceId);

    logger.info(`Retrieved sync status for user ${userId} in ${Date.now() - startTime}ms`);
    res.json(status);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/sync/conflicts/:conflictId/resolve
 * Resolve a sync conflict
 *
 * Body:
 * {
 *   "resolution": "use_server" | "use_client" | "use_merged",
 *   "mergedData": { ... } // Required if resolution is "use_merged"
 * }
 */
router.post('/conflicts/:conflictId/resolve', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  try {
    const userId = (req as any).user.id;
    const { conflictId } = req.params;
    const { resolution, mergedData } = req.body;

    // Validate resolution
    if (!['use_server', 'use_client', 'use_merged'].includes(resolution)) {
      throw new AppError('Invalid resolution. Must be use_server, use_client, or use_merged', 400);
    }

    if (resolution === 'use_merged' && !mergedData) {
      throw new AppError('mergedData is required when resolution is use_merged', 400);
    }

    await resolveConflict(userId, conflictId, resolution, mergedData);

    logger.info(`Conflict ${conflictId} resolved with ${resolution} in ${Date.now() - startTime}ms`);
    res.json({ message: 'Conflict resolved successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sync/devices
 * Get all devices for user
 */
router.get('/devices', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  try {
    const userId = (req as any).user.id;

    const DeviceSyncState = (await import('../models/DeviceSyncState')).default;
    const devices = await (DeviceSyncState as any).getActiveDevices(userId);

    logger.info(`Retrieved ${devices.length} devices for user ${userId} in ${Date.now() - startTime}ms`);
    res.json({ devices });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/sync/devices/:deviceId
 * Deactivate a device
 */
router.delete('/devices/:deviceId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  try {
    const userId = (req as any).user.id;
    const { deviceId } = req.params;

    const DeviceSyncState = (await import('../models/DeviceSyncState')).default;
    await DeviceSyncState.findOneAndUpdate(
      { userId, deviceId },
      { isActive: false },
      { new: true }
    );

    logger.info(`Deactivated device ${deviceId} for user ${userId} in ${Date.now() - startTime}ms`);
    res.json({ message: 'Device deactivated successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/sync/cleanup
 * Admin endpoint to cleanup old synced items
 *
 * Body:
 * {
 *   "daysOld": 30
 * }
 */
router.post('/cleanup', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  try {
    // Check if user is admin
    const user = (req as any).user;
    if (user.role !== 'admin') {
      throw new AppError('Unauthorized. Admin access required.', 403);
    }

    const daysOld = req.body.daysOld || 30;

    const deletedCount = await cleanupSyncQueue(daysOld);

    logger.info(`Cleanup completed: ${deletedCount} items deleted in ${Date.now() - startTime}ms`);
    res.json({
      message: 'Cleanup completed successfully',
      deletedCount
    });
  } catch (error) {
    next(error);
  }
});

export default router;
