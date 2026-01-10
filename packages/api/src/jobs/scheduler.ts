import cron from 'node-cron';
import { logger } from '../utils/logger';
import {
  processScheduledNotifications,
  cleanupExpiredNotifications
} from '../services/notification.service';
import { cleanupOldAnalyticsEvents, aggregateUserDailyStats } from '../services/analytics.service';
import { cleanupSyncQueue } from '../services/sync.service';
import UserGameStats from '../models/UserGameStats';

/**
 * Initialize all scheduled jobs
 */
export function initializeScheduler() {
  logger.info('Initializing scheduled jobs...');

  // Process scheduled notifications every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      const count = await processScheduledNotifications();
      if (count > 0) {
        logger.info(`Scheduled job: Processed ${count} notifications`);
      }
    } catch (error) {
      logger.error('Scheduled job error (notifications):', error);
    }
  });

  // Clean up expired notifications daily at 2 AM
  cron.schedule('0 2 * * *', async () => {
    try {
      const count = await cleanupExpiredNotifications();
      logger.info(`Scheduled job: Cleaned up ${count} expired notifications`);
    } catch (error) {
      logger.error('Scheduled job error (cleanup notifications):', error);
    }
  });

  // Clean up old analytics events monthly
  cron.schedule('0 3 1 * *', async () => {
    try {
      const count = await cleanupOldAnalyticsEvents(90);
      logger.info(`Scheduled job: Cleaned up ${count} old analytics events`);
    } catch (error) {
      logger.error('Scheduled job error (cleanup analytics):', error);
    }
  });

  // Clean up sync queue daily at 3 AM
  cron.schedule('0 3 * * *', async () => {
    try {
      const count = await cleanupSyncQueue(30);
      logger.info(`Scheduled job: Cleaned up ${count} synced items`);
    } catch (error) {
      logger.error('Scheduled job error (cleanup sync queue):', error);
    }
  });

  // Send streak reminders daily at 8 PM
  cron.schedule('0 20 * * *', async () => {
    try {
      await sendStreakReminders();
      logger.info('Scheduled job: Sent streak reminders');
    } catch (error) {
      logger.error('Scheduled job error (streak reminders):', error);
    }
  });

  // Aggregate daily stats at midnight
  cron.schedule('0 0 * * *', async () => {
    try {
      await aggregateDailyStats();
      logger.info('Scheduled job: Aggregated daily stats');
    } catch (error) {
      logger.error('Scheduled job error (aggregate stats):', error);
    }
  });

  logger.info('Scheduled jobs initialized successfully');
}

/**
 * Send streak reminders to users with active streaks
 */
async function sendStreakReminders() {
  try {
    const { notifyStreakReminder } = await import('../services/notification.service');

    // Get users with current streaks > 0
    const usersWithStreaks = await UserGameStats.find({
      'streak.current': { $gt: 0 }
    }).limit(1000); // Process in batches

    let sentCount = 0;

    for (const userStats of usersWithStreaks) {
      try {
        // Check if user already studied today
        const lastActivity = userStats.streak.lastActivityDate;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (lastActivity) {
          const lastActivityDate = new Date(lastActivity);
          lastActivityDate.setHours(0, 0, 0, 0);

          if (lastActivityDate.getTime() === today.getTime()) {
            // User already studied today, skip
            continue;
          }
        }

        await notifyStreakReminder(
          userStats.userId.toString(),
          userStats.streak.current
        );
        sentCount++;
      } catch (error) {
        logger.error(`Failed to send streak reminder to user ${userStats.userId}:`, error);
      }
    }

    logger.info(`Sent ${sentCount} streak reminders`);
    return sentCount;
  } catch (error) {
    logger.error('Error sending streak reminders:', error);
    throw error;
  }
}

/**
 * Aggregate daily stats for all active users
 */
async function aggregateDailyStats() {
  try {
    // Get users who were active yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    // Import models
    const { LearnerProgress } = await import('../models/LearnerProgress');

    // Find users who had activity yesterday
    const activeProgress = await LearnerProgress.find({
      lastAccessedAt: { $gte: yesterday, $lte: endOfYesterday }
    }).distinct('userId');

    let aggregatedCount = 0;

    for (const userId of activeProgress) {
      try {
        await aggregateUserDailyStats(userId.toString(), yesterday);
        aggregatedCount++;
      } catch (error) {
        logger.error(`Failed to aggregate stats for user ${userId}:`, error);
      }
    }

    logger.info(`Aggregated daily stats for ${aggregatedCount} users`);
    return aggregatedCount;
  } catch (error) {
    logger.error('Error aggregating daily stats:', error);
    throw error;
  }
}
