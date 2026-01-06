import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { RegisterDTOSchema, LoginDTOSchema, VerifyOTPDTOSchema } from '@adaptive-lms/shared';
import { User } from '../models/User';
import { OTP } from '../models/OTP';
import { hashPassword, comparePassword, validatePasswordStrength } from '../utils/password';
import { generateTokenPair, verifyRefreshToken } from '../utils/jwt';
import { sendOTPEmail, sendWelcomeEmail } from '../services/email.service';
import { AppError } from '../middleware/error-handler';
import { authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/auth/register
 * Register new user with email + send OTP
 */
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const data = RegisterDTOSchema.parse(req.body);

    // Validate password strength
    const passwordValidation = validatePasswordStrength(data.password);
    if (!passwordValidation.valid) {
      throw new AppError(400, passwordValidation.errors.join(', '));
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      throw new AppError(409, 'Email already registered');
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create user (unverified)
    const user = new User({
      email: data.email,
      passwordHash,
      role: 'learner',
      profile: {
        displayName: data.displayName,
        language: data.language,
        timezone: 'Asia/Bangkok',
      },
      sessions: [],
    });

    await user.save();

    // Generate and send OTP
    const otp = await OTP.createOTP(data.email);
    await sendOTPEmail(data.email, otp.otp, data.language);

    logger.info('User registered, OTP sent:', { email: data.email });

    res.status(201).json({
      message: 'Registration successful. Please check your email for OTP.',
      email: data.email,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/verify-otp
 * Verify OTP and complete registration
 */
router.post('/verify-otp', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const data = VerifyOTPDTOSchema.parse(req.body);

    // Verify OTP
    const isValid = await OTP.verifyOTP(data.email, data.otp);
    if (!isValid) {
      throw new AppError(400, 'Invalid or expired OTP');
    }

    // Find user
    const user = await User.findOne({ email: data.email });
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Generate tokens
    const tokens = generateTokenPair(
      user._id.toString(),
      user.email,
      user.role,
      data.deviceId
    );

    // Add session
    await user.addSession(data.deviceId, data.platform, tokens.refreshToken);

    // Send welcome email
    await sendWelcomeEmail(user.email, user.profile.displayName, user.profile.language);

    logger.info('OTP verified, user logged in:', { email: user.email, deviceId: data.deviceId });

    res.json({
      message: 'OTP verified successfully',
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        profile: user.profile,
      },
      ...tokens,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const data = LoginDTOSchema.parse(req.body);

    // Find user
    const user = await User.findOne({ email: data.email }).select('+passwordHash');
    if (!user) {
      throw new AppError(401, 'Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await comparePassword(data.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError(401, 'Invalid email or password');
    }

    // Generate tokens
    const tokens = generateTokenPair(
      user._id.toString(),
      user.email,
      user.role,
      data.deviceId
    );

    // Add session
    await user.addSession(data.deviceId, data.platform, tokens.refreshToken);

    logger.info('User logged in:', { email: user.email, deviceId: data.deviceId });

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        profile: user.profile,
      },
      ...tokens,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError(400, 'Refresh token required');
    }

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);

    // Find user and verify session
    const user = await User.findById(payload.userId);
    if (!user) {
      throw new AppError(401, 'User not found');
    }

    const session = user.sessions.find((s: any) => s.deviceId === payload.deviceId && s.token === refreshToken);
    if (!session) {
      throw new AppError(401, 'Invalid refresh token');
    }

    // Generate new tokens (refresh token rotation)
    const tokens = generateTokenPair(
      user._id.toString(),
      user.email,
      user.role,
      payload.deviceId
    );

    // Update session with new refresh token
    await user.addSession(payload.deviceId, session.platform, tokens.refreshToken, session.pushToken);

    logger.info('Token refreshed:', { userId: user._id, deviceId: payload.deviceId });

    res.json({
      message: 'Token refreshed successfully',
      ...tokens,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * Logout current device
 */
router.post('/logout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Not authenticated');
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    await user.removeSession(req.user.deviceId);

    logger.info('User logged out:', { userId: user._id, deviceId: req.user.deviceId });

    res.json({
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout-all
 * Logout all devices
 */
router.post('/logout-all', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Not authenticated');
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    const sessionCount = user.sessions.length;
    await user.removeAllSessions();

    logger.info('User logged out all devices:', { userId: user._id, sessionCount });

    res.json({
      message: `Logged out from ${sessionCount} device(s) successfully`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/resend-otp
 * Resend OTP for verification
 */
router.post('/resend-otp', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, language } = req.body;

    if (!email) {
      throw new AppError(400, 'Email required');
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Generate and send new OTP
    const otp = await OTP.createOTP(email);
    await sendOTPEmail(email, otp.otp, language || user.profile.language);

    logger.info('OTP resent:', { email });

    res.json({
      message: 'OTP sent successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
