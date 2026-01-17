import express from 'express';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database';
import { logger } from './utils/logger';

// Import middleware
import { getSecurityConfig, configureHelmet, configureCors, requestId, responseTime, sanitizeInput } from './middleware/security';
import { generalRateLimiter, authRateLimiter, aiRateLimiter, syncRateLimiter } from './middleware/rate-limiter';
import { requestLogger } from './utils/monitoring';
import { globalErrorHandler, notFoundHandler } from './utils/error-tracker';

// Import routes
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import xapiRoutes from './routes/xapi';
import coursesRoutes from './routes/courses';
import adminContentRoutes from './routes/admin/content';
import adminQuizzesRoutes from './routes/admin/quizzes';
import masteryRoutes from './routes/mastery';
import adaptiveRoutes from './routes/adaptive';
import quizzesRoutes from './routes/quizzes';
import tutorRoutes from './routes/tutor';
import gamificationRoutes from './routes/gamification';
import syncRoutes from './routes/sync';
import notificationsRoutes from './routes/notifications';
import analyticsRoutes from './routes/analytics';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const securityConfig = getSecurityConfig();

// Trust proxy (for load balancers)
if (securityConfig.trustProxy || process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security middleware
app.use(configureHelmet(securityConfig));
app.use(configureCors(securityConfig));

// Request processing middleware
app.use(requestId);
app.use(responseTime);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeInput);

// Logging middleware
app.use(requestLogger);

// Health checks (no rate limiting)
app.use('/health', healthRoutes);

// Apply rate limiting to API routes
app.use('/api', generalRateLimiter);

// Routes with specific rate limiters
app.use('/api/auth', authRateLimiter, authRoutes);
app.use('/api/users', usersRoutes);
app.use('/xapi', xapiRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/admin', adminContentRoutes);
app.use('/api/admin', adminQuizzesRoutes);
app.use('/api', masteryRoutes);
app.use('/api', adaptiveRoutes);
app.use('/api/quizzes', quizzesRoutes);
app.use('/api/tutor', aiRateLimiter, tutorRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/sync', syncRateLimiter, syncRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(globalErrorHandler);

// Start server
async function startServer() {
  try {
    await connectDatabase();

    // Initialize scheduled jobs (notifications, analytics aggregation, cleanup)
    if (process.env.ENABLE_SCHEDULER !== 'false') {
      const { initializeScheduler } = await import('./jobs/scheduler');
      initializeScheduler();
    }

    app.listen(PORT, () => {
      logger.info(`API server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Security: ${securityConfig.isDevelopment ? 'development' : 'production'} mode`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer();

export default app;
