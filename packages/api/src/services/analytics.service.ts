import AnalyticsEvent, { AnalyticsAggregate } from '../models/Analytics';
import { LearnerProgress } from '../models/LearnerProgress';
import { QuizAttempt } from '../models/QuizAttempt';
import UserGameStats from '../models/UserGameStats';
import UserAchievement from '../models/UserAchievement';
import { logger } from '../utils/logger';
import { Types } from 'mongoose';

/**
 * Track analytics event
 */
export async function trackEvent(
  eventType: string,
  eventCategory: 'engagement' | 'performance' | 'behavior' | 'system',
  eventData: any,
  userId?: string,
  sessionId?: string,
  metadata?: any
): Promise<void> {
  try {
    const event = new AnalyticsEvent({
      userId: userId ? new Types.ObjectId(userId) : undefined,
      sessionId,
      eventType,
      eventCategory,
      eventData,
      metadata: metadata || {},
      timestamp: new Date()
    });

    await event.save();
  } catch (error) {
    // Don't throw error - analytics failures shouldn't break the application
    logger.error('Error tracking analytics event:', error);
  }
}

/**
 * Aggregate user daily stats
 */
export async function aggregateUserDailyStats(
  userId: string,
  date: Date
): Promise<any> {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get progress for the day
    const progressData = await LearnerProgress.find({
      userId: new Types.ObjectId(userId),
      lastAccessedAt: { $gte: startOfDay, $lte: endOfDay }
    });

    const lessonsStarted = progressData.filter(p => p.status === 'in-progress' || p.status === 'completed').length;
    const lessonsCompleted = progressData.filter(p => p.status === 'completed' && p.completedAt && p.completedAt >= startOfDay && p.completedAt <= endOfDay).length;

    // Get quiz attempts for the day
    const quizAttempts = await QuizAttempt.find({
      userId: new Types.ObjectId(userId),
      submittedAt: { $gte: startOfDay, $lte: endOfDay }
    });

    const quizzesTaken = quizAttempts.length;
    const quizzesPassed = quizAttempts.filter(a => a.score && a.score.percentage >= 70).length;
    const avgQuizScore = quizAttempts.length > 0
      ? quizAttempts.reduce((sum, a) => sum + (a.score?.percentage || 0), 0) / quizAttempts.length
      : 0;

    // Get gamification stats for the day
    const achievements = await UserAchievement.find({
      userId: new Types.ObjectId(userId),
      earnedAt: { $gte: startOfDay, $lte: endOfDay }
    });

    const achievementsUnlocked = achievements.length;

    // Get XP earned (would need to track XP changes - simplified here)
    const gameStats = await UserGameStats.findOne({ userId: new Types.ObjectId(userId) });
    const xpEarned = 0; // Placeholder - would need XP history tracking

    // Create or update aggregate
    const aggregate = await AnalyticsAggregate.findOneAndUpdate(
      {
        aggregateType: 'user_daily',
        aggregateKey: userId,
        'period.start': startOfDay,
        'period.granularity': 'day'
      },
      {
        $set: {
          'period.end': endOfDay,
          'metrics.sessionsCount': 1, // Placeholder - would need session tracking
          'metrics.lessonsStarted': lessonsStarted,
          'metrics.lessonsCompleted': lessonsCompleted,
          'metrics.quizzesTaken': quizzesTaken,
          'metrics.quizzesPassed': quizzesPassed,
          'metrics.avgQuizScore': avgQuizScore,
          'metrics.achievementsUnlocked': achievementsUnlocked,
          'metrics.xpEarned': xpEarned,
          'metrics.streakDays': gameStats?.streak.current || 0
        }
      },
      { upsert: true, new: true }
    );

    logger.info(`Aggregated daily stats for user ${userId} on ${date.toISOString().split('T')[0]}`);
    return aggregate;
  } catch (error) {
    logger.error('Error aggregating user daily stats:', error);
    throw error;
  }
}

/**
 * Get user analytics summary
 */
export async function getUserAnalyticsSummary(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<any> {
  try {
    const aggregates = await AnalyticsAggregate.find({
      aggregateType: 'user_daily',
      aggregateKey: userId,
      'period.start': { $gte: startDate, $lte: endDate }
    }).sort({ 'period.start': 1 });

    if (aggregates.length === 0) {
      return {
        period: { start: startDate, end: endDate },
        metrics: {
          totalSessions: 0,
          totalLessons: 0,
          totalQuizzes: 0,
          avgQuizScore: 0,
          totalAchievements: 0,
          totalXP: 0
        },
        dailyData: []
      };
    }

    const summary = {
      period: { start: startDate, end: endDate },
      metrics: {
        totalSessions: aggregates.reduce((sum, a) => sum + (a.metrics.sessionsCount || 0), 0),
        totalLessons: aggregates.reduce((sum, a) => sum + (a.metrics.lessonsCompleted || 0), 0),
        totalQuizzes: aggregates.reduce((sum, a) => sum + (a.metrics.quizzesTaken || 0), 0),
        avgQuizScore: aggregates.length > 0
          ? aggregates.reduce((sum, a) => sum + (a.metrics.avgQuizScore || 0), 0) / aggregates.length
          : 0,
        totalAchievements: aggregates.reduce((sum, a) => sum + (a.metrics.achievementsUnlocked || 0), 0),
        totalXP: aggregates.reduce((sum, a) => sum + (a.metrics.xpEarned || 0), 0)
      },
      dailyData: aggregates.map(a => ({
        date: a.period.start,
        lessons: a.metrics.lessonsCompleted,
        quizzes: a.metrics.quizzesTaken,
        quizScore: a.metrics.avgQuizScore,
        achievements: a.metrics.achievementsUnlocked,
        xp: a.metrics.xpEarned
      }))
    };

    return summary;
  } catch (error) {
    logger.error('Error getting user analytics summary:', error);
    throw error;
  }
}

/**
 * Get course analytics
 */
export async function getCourseAnalytics(
  courseId: string,
  startDate: Date,
  endDate: Date
): Promise<any> {
  try {
    // Get all progress for the course
    const allProgress = await LearnerProgress.find({
      courseId: new Types.ObjectId(courseId),
      lastAccessedAt: { $gte: startDate, $lte: endDate }
    }).populate('userId', 'name email');

    // Count unique users
    const activeUsers = new Set(allProgress.map(p => p.userId.toString())).size;

    // Count lessons
    const lessonsStarted = allProgress.filter(p => p.status !== 'not-started').length;
    const lessonsCompleted = allProgress.filter(p => p.status === 'completed').length;

    // Calculate completion rate
    const completionRate = lessonsStarted > 0 ? (lessonsCompleted / lessonsStarted) * 100 : 0;

    // Get average time spent
    const totalTime = allProgress.reduce((sum, p) => sum + (p.timeSpent || 0), 0);
    const avgTimePerLesson = lessonsStarted > 0 ? totalTime / lessonsStarted : 0;

    return {
      period: { start: startDate, end: endDate },
      courseId,
      metrics: {
        activeUsers,
        lessonsStarted,
        lessonsCompleted,
        completionRate,
        avgTimePerLesson,
        totalTimeSpent: totalTime
      }
    };
  } catch (error) {
    logger.error('Error getting course analytics:', error);
    throw error;
  }
}

/**
 * Get system analytics
 */
export async function getSystemAnalytics(
  startDate: Date,
  endDate: Date
): Promise<any> {
  try {
    // Get aggregated system metrics
    const aggregates = await AnalyticsAggregate.find({
      aggregateType: 'system_hourly',
      'period.start': { $gte: startDate, $lte: endDate }
    }).sort({ 'period.start': 1 });

    const summary = {
      period: { start: startDate, end: endDate },
      metrics: {
        totalApiCalls: aggregates.reduce((sum, a) => sum + (a.metrics.apiCalls || 0), 0),
        totalErrors: aggregates.reduce((sum, a) => sum + (a.metrics.errors || 0), 0),
        avgResponseTime: aggregates.length > 0
          ? aggregates.reduce((sum, a) => sum + (a.metrics.avgResponseTime || 0), 0) / aggregates.length
          : 0,
        errorRate: 0
      },
      hourlyData: aggregates.map(a => ({
        timestamp: a.period.start,
        apiCalls: a.metrics.apiCalls,
        errors: a.metrics.errors,
        avgResponseTime: a.metrics.avgResponseTime
      }))
    };

    // Calculate error rate
    if (summary.metrics.totalApiCalls > 0) {
      summary.metrics.errorRate = (summary.metrics.totalErrors / summary.metrics.totalApiCalls) * 100;
    }

    return summary;
  } catch (error) {
    logger.error('Error getting system analytics:', error);
    throw error;
  }
}

/**
 * Get learning insights for user
 */
export async function getLearningInsights(userId: string): Promise<any> {
  try {
    const gameStats = await UserGameStats.findOne({ userId: new Types.ObjectId(userId) });

    if (!gameStats) {
      return {
        strengths: [],
        improvements: [],
        recommendations: []
      };
    }

    const insights = {
      strengths: [] as string[],
      improvements: [] as string[],
      recommendations: [] as string[]
    };

    // Analyze strengths
    if (gameStats.stats.averageMastery >= 0.8) {
      insights.strengths.push('High average mastery across competencies');
    }

    if (gameStats.streak.current >= 7) {
      insights.strengths.push('Consistent daily learning habit');
    }

    if (gameStats.stats.perfectQuizzes >= 5) {
      insights.strengths.push('Excellent quiz performance');
    }

    // Analyze areas for improvement
    if (gameStats.stats.averageMastery < 0.6) {
      insights.improvements.push('Focus on improving competency mastery');
    }

    if (gameStats.streak.current === 0) {
      insights.improvements.push('Build a daily learning streak');
    }

    const passRate = gameStats.stats.quizzesPassed > 0
      ? (gameStats.stats.quizzesPassed / (gameStats.stats.quizzesPassed + gameStats.stats.perfectQuizzes)) * 100
      : 0;

    if (passRate < 70) {
      insights.improvements.push('Review quiz materials before attempting');
    }

    // Generate recommendations
    if (gameStats.stats.lessonsCompleted > 0 && gameStats.stats.quizzesPassed === 0) {
      insights.recommendations.push('Take quizzes to test your knowledge');
    }

    if (gameStats.streak.longest > gameStats.streak.current + 3) {
      insights.recommendations.push('Try to beat your longest streak!');
    }

    if (gameStats.stats.averageMastery < 0.7) {
      insights.recommendations.push('Review lessons with low mastery scores');
    }

    return insights;
  } catch (error) {
    logger.error('Error getting learning insights:', error);
    throw error;
  }
}

/**
 * Clean up old analytics events
 */
export async function cleanupOldAnalyticsEvents(daysOld: number = 90): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await AnalyticsEvent.deleteMany({
      timestamp: { $lt: cutoffDate }
    });

    if (result.deletedCount > 0) {
      logger.info(`Cleaned up ${result.deletedCount} old analytics events (>${daysOld} days)`);
    }

    return result.deletedCount;
  } catch (error) {
    logger.error('Error cleaning up old analytics events:', error);
    throw error;
  }
}
