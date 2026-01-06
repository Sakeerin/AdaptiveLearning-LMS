import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/error-handler';

// Import routes
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import xapiRoutes from './routes/xapi';
import coursesRoutes from './routes/courses';
import adminContentRoutes from './routes/admin/content';
import masteryRoutes from './routes/mastery';
import quizzesRoutes from './routes/quizzes';
import tutorRoutes from './routes/tutor';
import gamificationRoutes from './routes/gamification';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/xapi', xapiRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/admin', adminContentRoutes);
app.use('/api', masteryRoutes);
app.use('/api/quizzes', quizzesRoutes);
app.use('/api/tutor', tutorRoutes);
app.use('/api/gamification', gamificationRoutes);

// Error handling
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    await connectDatabase();
    app.listen(PORT, () => {
      logger.info(`API server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
