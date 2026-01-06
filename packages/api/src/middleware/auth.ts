import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JWTPayload } from '../utils/jwt';
import { AppError } from './error-handler';
import { User } from '../models/User';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Middleware to authenticate user via JWT
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'No token provided');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const payload = verifyAccessToken(token);

    // Verify user still exists
    const user = await User.findById(payload.userId);
    if (!user) {
      throw new AppError(401, 'User not found');
    }

    // Verify device session exists
    const session = user.sessions.find((s: any) => s.deviceId === payload.deviceId);
    if (!session) {
      throw new AppError(401, 'Session not found');
    }

    // Update session activity
    await user.updateSessionActivity(payload.deviceId);

    // Attach user payload to request
    req.user = payload;

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware to check user role
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(401, 'Not authenticated');
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError(403, 'Insufficient permissions');
    }

    next();
  };
}

/**
 * Middleware to check if user is admin
 */
export const requireAdmin = requireRole('admin');

/**
 * Middleware to check if user is author or admin
 */
export const requireAuthor = requireRole('author', 'admin');

/**
 * Optional authentication - doesn't fail if no token
 */
export async function optionalAuthenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyAccessToken(token);

      const user = await User.findById(payload.userId);
      if (user) {
        const session = user.sessions.find((s: any) => s.deviceId === payload.deviceId);
        if (session) {
          req.user = payload;
          await user.updateSessionActivity(payload.deviceId);
        }
      }
    }

    next();
  } catch (error) {
    // Silent fail - continue without user
    next();
  }
}
