import jwt from 'jsonwebtoken';
import { AppError } from '../middleware/error-handler';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  deviceId: string;
  type: 'access' | 'refresh';
}

/**
 * Generate access token (short-lived: 15 minutes)
 */
export function generateAccessToken(
  userId: string,
  email: string,
  role: string,
  deviceId: string
): string {
  const payload: JWTPayload = {
    userId,
    email,
    role,
    deviceId,
    type: 'access',
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'adaptive-lms',
    audience: 'adaptive-lms-api',
  });
}

/**
 * Generate refresh token (long-lived: 7 days)
 */
export function generateRefreshToken(
  userId: string,
  email: string,
  role: string,
  deviceId: string
): string {
  const payload: JWTPayload = {
    userId,
    email,
    role,
    deviceId,
    type: 'refresh',
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: 'adaptive-lms',
    audience: 'adaptive-lms-api',
  });
}

/**
 * Generate both access and refresh tokens
 */
export function generateTokenPair(
  userId: string,
  email: string,
  role: string,
  deviceId: string
) {
  return {
    accessToken: generateAccessToken(userId, email, role, deviceId),
    refreshToken: generateRefreshToken(userId, email, role, deviceId),
    expiresIn: JWT_EXPIRES_IN,
  };
}

/**
 * Verify JWT token and return payload
 */
export function verifyToken(token: string): JWTPayload {
  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      issuer: 'adaptive-lms',
      audience: 'adaptive-lms-api',
    }) as JWTPayload;

    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError(401, 'Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError(401, 'Invalid token');
    }
    throw new AppError(401, 'Token verification failed');
  }
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): JWTPayload {
  const payload = verifyToken(token);

  if (payload.type !== 'access') {
    throw new AppError(401, 'Invalid token type');
  }

  return payload;
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): JWTPayload {
  const payload = verifyToken(token);

  if (payload.type !== 'refresh') {
    throw new AppError(401, 'Invalid token type');
  }

  return payload;
}

/**
 * Decode token without verification (for debugging/logging)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error) {
    return null;
  }
}
