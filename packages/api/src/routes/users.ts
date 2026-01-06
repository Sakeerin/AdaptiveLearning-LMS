import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserProfileSchema } from '@adaptive-lms/shared';
import { User } from '../models/User';
import { AppError } from '../middleware/error-handler';
import { authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/users/profile
 * Get current user's profile
 */
router.get('/profile', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Not authenticated');
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    res.json({
      id: user._id,
      email: user.email,
      role: user.role,
      profile: user.profile,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/users/profile
 * Update current user's profile
 */
router.patch('/profile', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Not authenticated');
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Validate profile updates with Zod
    const UpdateProfileSchema = UserProfileSchema.partial();
    const updates = UpdateProfileSchema.parse(req.body);

    // Update profile fields
    Object.assign(user.profile, updates);
    await user.save();

    logger.info('User profile updated:', { userId: user._id, updates: Object.keys(updates) });

    res.json({
      message: 'Profile updated successfully',
      profile: user.profile,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/users/sessions
 * Get current user's active sessions
 */
router.get('/sessions', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Not authenticated');
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Return sessions without refresh tokens (security)
    const sessions = user.sessions.map((session: any) => ({
      deviceId: session.deviceId,
      platform: session.platform,
      lastActive: session.lastActive,
      current: session.deviceId === req.user!.deviceId,
    }));

    res.json({
      sessions,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/users/sessions/:deviceId
 * Logout specific device
 */
router.delete('/sessions/:deviceId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Not authenticated');
    }

    const { deviceId } = req.params;

    const user = await User.findById(req.user.userId);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Check if session exists
    const sessionExists = user.sessions.some((s: any) => s.deviceId === deviceId);
    if (!sessionExists) {
      throw new AppError(404, 'Session not found');
    }

    await user.removeSession(deviceId);

    logger.info('Device session removed:', { userId: user._id, deviceId });

    res.json({
      message: 'Device logged out successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
