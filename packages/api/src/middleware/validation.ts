import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Validation middleware factory
 */
export function validate(schema: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }

      if (schema.query) {
        req.query = await schema.query.parseAsync(req.query);
      }

      if (schema.params) {
        req.params = await schema.params.parseAsync(req.params);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        logger.warn('Validation failed', {
          path: req.path,
          method: req.method,
          errors: formattedErrors
        });

        return res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid request data',
          details: formattedErrors
        });
      }

      next(error);
    }
  };
}

// Common Zod schemas

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId');

export const paginationSchema = z.object({
  limit: z.string().transform(val => Math.min(parseInt(val) || 50, 500)).optional(),
  offset: z.string().transform(val => parseInt(val) || 0).optional(),
  page: z.string().transform(val => Math.max(parseInt(val) || 1, 1)).optional()
});

export const languageSchema = z.enum(['th', 'en']).default('en');

export const bilingualTextSchema = z.object({
  th: z.string().min(1, 'Thai text is required'),
  en: z.string().min(1, 'English text is required')
});

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['learner', 'instructor', 'admin']).default('learner')
});

// Quiz schemas
export const submitQuizSchema = z.object({
  responses: z.array(z.object({
    itemId: objectIdSchema,
    response: z.union([z.string(), z.array(z.string())]),
    hintsUsed: z.number().min(0).optional(),
    timeTaken: z.number().min(0).optional()
  })).min(1, 'At least one response is required')
});

export const createQuizItemSchema = z.object({
  type: z.enum(['mcq', 'multi-select', 'short-answer']),
  question: bilingualTextSchema,
  options: z.array(z.object({
    id: z.string(),
    text: bilingualTextSchema,
    correct: z.boolean()
  })).optional(),
  correctAnswer: z.string().optional(),
  explanation: bilingualTextSchema.optional(),
  competencyId: objectIdSchema.optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  metadata: z.object({
    tags: z.array(z.string()).optional(),
    category: z.string().optional()
  }).optional()
});

// Progress schemas
export const updateProgressSchema = z.object({
  lessonId: objectIdSchema,
  courseId: objectIdSchema,
  completionPercentage: z.number().min(0).max(100),
  timeSpent: z.number().min(0)
});

// Sync schemas
export const syncPushSchema = z.object({
  deviceId: z.string().min(1, 'deviceId is required'),
  deviceName: z.string().optional(),
  items: z.array(z.object({
    id: z.string().optional(),
    operation: z.enum(['create', 'update', 'delete']),
    resourceType: z.enum(['lesson_progress', 'quiz_attempt', 'xapi_statement', 'conversation', 'mastery']),
    resourceId: z.string().optional(),
    data: z.any(),
    clientTimestamp: z.string().datetime()
  })).min(1, 'At least one item is required'),
  metadata: z.object({
    appVersion: z.string().optional(),
    platform: z.string().optional(),
    networkType: z.string().optional()
  }).optional()
});

export const syncPullSchema = z.object({
  deviceId: z.string().min(1, 'deviceId is required'),
  lastSyncVersion: z.number().min(0),
  resourceTypes: z.array(z.string()).optional()
});

// Notification schemas
export const updatePreferencesSchema = z.object({
  channels: z.object({
    in_app: z.object({ enabled: z.boolean() }).optional(),
    email: z.object({
      enabled: z.boolean(),
      address: z.string().email().optional()
    }).optional(),
    push: z.object({ enabled: z.boolean() }).optional()
  }).optional(),
  types: z.record(z.object({
    in_app: z.boolean().optional(),
    email: z.boolean().optional(),
    push: z.boolean().optional()
  })).optional(),
  schedule: z.object({
    quietHours: z.object({
      enabled: z.boolean(),
      start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
      end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
      timezone: z.string()
    }).optional(),
    digestFrequency: z.enum(['realtime', 'hourly', 'daily', 'weekly']).optional()
  }).optional()
});

export const registerPushTokenSchema = z.object({
  token: z.string().min(1, 'token is required'),
  platform: z.enum(['ios', 'android', 'web']),
  deviceId: z.string().min(1, 'deviceId is required')
});

// Analytics schemas
export const trackEventSchema = z.object({
  eventType: z.string().min(1, 'eventType is required'),
  eventCategory: z.enum(['engagement', 'performance', 'behavior', 'system']),
  eventData: z.any(),
  sessionId: z.string().optional(),
  metadata: z.object({
    platform: z.string().optional(),
    deviceId: z.string().optional(),
    appVersion: z.string().optional()
  }).optional()
});

// Tutor schemas
export const chatSchema = z.object({
  message: z.string().min(1, 'Message is required').max(2000, 'Message too long (max 2000 characters)'),
  conversationId: objectIdSchema.optional(),
  lessonId: objectIdSchema.optional(),
  language: languageSchema.optional()
});

// Content schemas
export const createLessonSchema = z.object({
  title: bilingualTextSchema,
  description: bilingualTextSchema.optional(),
  content: bilingualTextSchema,
  moduleId: objectIdSchema,
  order: z.number().min(0),
  duration: z.number().min(0).optional(),
  type: z.enum(['video', 'text', 'interactive', 'assessment']).default('text'),
  prerequisites: z.array(objectIdSchema).optional(),
  competencies: z.array(objectIdSchema).optional()
});

export const createCourseSchema = z.object({
  title: bilingualTextSchema,
  description: bilingualTextSchema,
  thumbnail: z.string().url().optional(),
  duration: z.number().min(0).optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  isPublished: z.boolean().default(false)
});

// Gamification schemas
export const createAchievementSchema = z.object({
  key: z.string().min(1).max(50).regex(/^[a-z0-9_]+$/, 'Key must be lowercase alphanumeric with underscores'),
  type: z.enum(['badge', 'milestone', 'streak', 'mastery']),
  name: bilingualTextSchema,
  description: bilingualTextSchema,
  icon: z.string().min(1),
  criteria: z.object({
    metric: z.enum(['xp', 'lessons_completed', 'quizzes_passed', 'streak_days', 'mastery_avg', 'perfect_quizzes']),
    threshold: z.number().min(0),
    timeframe: z.enum(['daily', 'weekly', 'monthly', 'all-time']).optional()
  }),
  reward: z.object({
    xp: z.number().min(0).default(0),
    points: z.number().min(0).default(0)
  }),
  tier: z.enum(['bronze', 'silver', 'gold', 'platinum']).optional(),
  isActive: z.boolean().default(true)
});
