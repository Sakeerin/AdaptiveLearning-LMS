import Notification from '../models/Notification';
import NotificationPreferences from '../models/NotificationPreferences';
import { logger } from '../utils/logger';
import { Types } from 'mongoose';

export interface CreateNotificationInput {
  userId: string;
  type: 'achievement' | 'reminder' | 'announcement' | 'streak' | 'quiz_result' | 'course_update' | 'level_up';
  title: { th: string; en: string };
  message: { th: string; en: string };
  data?: any;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  scheduledFor?: Date;
  expiresAt?: Date;
  metadata?: {
    actionUrl?: string;
    imageUrl?: string;
    category?: string;
  };
}

/**
 * Create and send notification
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<any> {
  const { userId, type, title, message, data, priority, scheduledFor, expiresAt, metadata } = input;

  try {
    // Get user preferences
    const prefs = await (NotificationPreferences as any).getOrCreate(userId);

    // Determine which channels to use based on preferences
    const channels: ('in_app' | 'email' | 'push')[] = [];

    if (prefs.channels.in_app.enabled && prefs.types[type].in_app) {
      channels.push('in_app');
    }

    if (prefs.channels.email.enabled && prefs.types[type].email && prefs.channels.email.verified) {
      channels.push('email');
    }

    if (prefs.channels.push.enabled && prefs.types[type].push && prefs.channels.push.tokens.length > 0) {
      channels.push('push');
    }

    if (channels.length === 0) {
      logger.info(`No channels enabled for notification type ${type} for user ${userId}`);
      return null;
    }

    // Check quiet hours
    if (prefs.schedule.quietHours.enabled && !scheduledFor) {
      const now = new Date();
      const isQuietHours = checkQuietHours(
        now,
        prefs.schedule.quietHours.start,
        prefs.schedule.quietHours.end,
        prefs.schedule.quietHours.timezone
      );

      if (isQuietHours) {
        // Schedule for end of quiet hours
        scheduledFor = calculateQuietHoursEnd(
          now,
          prefs.schedule.quietHours.end,
          prefs.schedule.quietHours.timezone
        );
        logger.info(`Notification scheduled for end of quiet hours: ${scheduledFor}`);
      }
    }

    // Create notification
    const notification = new Notification({
      userId: new Types.ObjectId(userId),
      type,
      title,
      message,
      data,
      channels,
      status: {
        in_app: channels.includes('in_app') ? 'pending' : undefined,
        email: channels.includes('email') ? 'pending' : undefined,
        push: channels.includes('push') ? 'pending' : undefined
      },
      priority: priority || 'medium',
      scheduledFor,
      expiresAt,
      metadata: metadata || {}
    });

    await notification.save();

    // Send immediately if not scheduled
    if (!scheduledFor || scheduledFor <= new Date()) {
      await sendNotification(notification._id.toString());
    }

    logger.info(`Notification created for user ${userId}: ${type}`);
    return notification;
  } catch (error) {
    logger.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Send notification through all channels
 */
export async function sendNotification(notificationId: string): Promise<void> {
  try {
    const notification = await Notification.findById(notificationId).populate('userId');

    if (!notification) {
      throw new Error('Notification not found');
    }

    const user = notification.userId as any;

    // Send through each channel
    const promises: Promise<any>[] = [];

    if (notification.channels.includes('in_app')) {
      promises.push(sendInAppNotification(notification));
    }

    if (notification.channels.includes('email')) {
      promises.push(sendEmailNotification(notification, user));
    }

    if (notification.channels.includes('push')) {
      promises.push(sendPushNotification(notification, user._id.toString()));
    }

    await Promise.allSettled(promises);

    notification.sentAt = new Date();
    await notification.save();

    logger.info(`Notification ${notificationId} sent`);
  } catch (error) {
    logger.error('Error sending notification:', error);
    throw error;
  }
}

/**
 * Send in-app notification (just mark as delivered)
 */
async function sendInAppNotification(notification: any): Promise<void> {
  notification.status.in_app = 'delivered';
  await notification.save();
  logger.info(`In-app notification delivered: ${notification._id}`);
}

/**
 * Send email notification
 */
async function sendEmailNotification(notification: any, user: any): Promise<void> {
  try {
    // Get email configuration
    const emailEnabled = process.env.EMAIL_ENABLED === 'true';

    if (!emailEnabled) {
      logger.info('Email notifications disabled, skipping');
      notification.status.email = 'sent'; // Mark as sent in dev mode
      await notification.save();
      return;
    }

    // Get user's email
    const prefs = await NotificationPreferences.findOne({ userId: user._id });
    const email = prefs?.channels.email.address || user.email;

    if (!email) {
      throw new Error('No email address available');
    }

    // In a real implementation, this would use a service like SendGrid, AWS SES, etc.
    // For now, just log the email
    logger.info('Email notification (mock):', {
      to: email,
      subject: notification.title.en,
      body: notification.message.en,
      notificationId: notification._id
    });

    notification.status.email = 'sent';
    await notification.save();
  } catch (error) {
    logger.error('Failed to send email notification:', error);
    notification.status.email = 'failed';
    await notification.save();
  }
}

/**
 * Send push notification
 */
async function sendPushNotification(notification: any, userId: string): Promise<void> {
  try {
    const prefs = await NotificationPreferences.findOne({ userId: new Types.ObjectId(userId) });

    if (!prefs || prefs.channels.push.tokens.length === 0) {
      throw new Error('No push tokens available');
    }

    const pushEnabled = process.env.PUSH_NOTIFICATIONS_ENABLED === 'true';

    if (!pushEnabled) {
      logger.info('Push notifications disabled, skipping');
      notification.status.push = 'sent'; // Mark as sent in dev mode
      await notification.save();
      return;
    }

    // In a real implementation, this would use Firebase Cloud Messaging, APNs, etc.
    // For now, just log the push notification
    logger.info('Push notification (mock):', {
      tokens: prefs.channels.push.tokens.map((t: any) => ({ platform: t.platform, token: t.token.substring(0, 10) + '...' })),
      title: notification.title.en,
      body: notification.message.en,
      data: notification.data,
      notificationId: notification._id
    });

    notification.status.push = 'sent';
    await notification.save();
  } catch (error) {
    logger.error('Failed to send push notification:', error);
    notification.status.push = 'failed';
    await notification.save();
  }
}

/**
 * Check if current time is within quiet hours
 */
function checkQuietHours(
  now: Date,
  startTime: string,
  endTime: string,
  timezone: string
): boolean {
  // Simple implementation - just check hours
  // In production, use a library like moment-timezone or date-fns-tz
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeMinutes = currentHour * 60 + currentMinute;

  const [startHour, startMin] = startTime.split(':').map(Number);
  const startTimeMinutes = startHour * 60 + startMin;

  const [endHour, endMin] = endTime.split(':').map(Number);
  const endTimeMinutes = endHour * 60 + endMin;

  if (startTimeMinutes < endTimeMinutes) {
    // Normal case: e.g., 22:00 - 08:00 (next day)
    return currentTimeMinutes >= startTimeMinutes && currentTimeMinutes < endTimeMinutes;
  } else {
    // Crosses midnight: e.g., 22:00 - 08:00
    return currentTimeMinutes >= startTimeMinutes || currentTimeMinutes < endTimeMinutes;
  }
}

/**
 * Calculate when quiet hours end
 */
function calculateQuietHoursEnd(
  now: Date,
  endTime: string,
  timezone: string
): Date {
  const [endHour, endMin] = endTime.split(':').map(Number);
  const end = new Date(now);
  end.setHours(endHour, endMin, 0, 0);

  // If end time already passed today, schedule for tomorrow
  if (end <= now) {
    end.setDate(end.getDate() + 1);
  }

  return end;
}

/**
 * Send achievement notification
 */
export async function notifyAchievementEarned(
  userId: string,
  achievement: any
): Promise<void> {
  await createNotification({
    userId,
    type: 'achievement',
    title: {
      th: `🏆 ได้รับความสำเร็จใหม่!`,
      en: `🏆 New Achievement Unlocked!`
    },
    message: {
      th: `คุณได้รับ "${achievement.name.th}"`,
      en: `You earned "${achievement.name.en}"`
    },
    data: {
      achievementId: achievement._id,
      achievementKey: achievement.key
    },
    priority: 'high',
    metadata: {
      actionUrl: `/achievements/${achievement._id}`,
      imageUrl: achievement.icon,
      category: 'gamification'
    }
  });
}

/**
 * Send level up notification
 */
export async function notifyLevelUp(
  userId: string,
  newLevel: number,
  xp: number
): Promise<void> {
  await createNotification({
    userId,
    type: 'level_up',
    title: {
      th: `🎉 เลื่อนระดับแล้ว!`,
      en: `🎉 Level Up!`
    },
    message: {
      th: `ยินดีด้วย! คุณเลื่อนไปที่ระดับ ${newLevel}`,
      en: `Congratulations! You reached level ${newLevel}`
    },
    data: {
      newLevel,
      xp
    },
    priority: 'high',
    metadata: {
      actionUrl: '/profile',
      category: 'gamification'
    }
  });
}

/**
 * Send streak reminder
 */
export async function notifyStreakReminder(
  userId: string,
  currentStreak: number
): Promise<void> {
  await createNotification({
    userId,
    type: 'streak',
    title: {
      th: `🔥 รักษาสายยาวของคุณ!`,
      en: `🔥 Keep Your Streak!`
    },
    message: {
      th: `คุณมีสายยาว ${currentStreak} วัน อย่าลืมเรียนวันนี้!`,
      en: `You have a ${currentStreak} day streak. Don't forget to study today!`
    },
    data: {
      currentStreak
    },
    priority: 'medium',
    metadata: {
      actionUrl: '/dashboard',
      category: 'engagement'
    }
  });
}

/**
 * Send quiz result notification
 */
export async function notifyQuizResult(
  userId: string,
  quizTitle: string,
  score: number,
  passed: boolean
): Promise<void> {
  await createNotification({
    userId,
    type: 'quiz_result',
    title: {
      th: `📝 ผลการทดสอบ`,
      en: `📝 Quiz Result`
    },
    message: {
      th: `คุณได้ ${score}% ใน "${quizTitle}" - ${passed ? 'ผ่าน!' : 'ไม่ผ่าน'}`,
      en: `You scored ${score}% on "${quizTitle}" - ${passed ? 'Passed!' : 'Not Passed'}`
    },
    data: {
      quizTitle,
      score,
      passed
    },
    priority: passed ? 'medium' : 'high',
    metadata: {
      category: 'learning'
    }
  });
}

/**
 * Get user notifications
 */
export async function getUserNotifications(
  userId: string,
  options: {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
    type?: string;
  } = {}
): Promise<{ notifications: any[]; total: number; unreadCount: number }> {
  const {
    unreadOnly = false,
    limit = 50,
    offset = 0,
    type
  } = options;

  const query: any = { userId: new Types.ObjectId(userId) };

  if (unreadOnly) {
    query.readAt = { $exists: false };
  }

  if (type) {
    query.type = type;
  }

  // Filter out expired notifications
  query.$or = [
    { expiresAt: { $exists: false } },
    { expiresAt: { $gt: new Date() } }
  ];

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean(),
    Notification.countDocuments(query),
    (Notification as any).getUnreadCount(userId)
  ]);

  return {
    notifications,
    total,
    unreadCount
  };
}

/**
 * Process scheduled notifications
 */
export async function processScheduledNotifications(): Promise<number> {
  try {
    const now = new Date();

    const notifications = await Notification.find({
      scheduledFor: { $lte: now },
      sentAt: { $exists: false }
    }).limit(100);

    let processedCount = 0;

    for (const notification of notifications) {
      try {
        await sendNotification(notification._id.toString());
        processedCount++;
      } catch (error) {
        logger.error(`Failed to send scheduled notification ${notification._id}:`, error);
      }
    }

    if (processedCount > 0) {
      logger.info(`Processed ${processedCount} scheduled notifications`);
    }

    return processedCount;
  } catch (error) {
    logger.error('Error processing scheduled notifications:', error);
    throw error;
  }
}

/**
 * Clean up expired notifications
 */
export async function cleanupExpiredNotifications(): Promise<number> {
  try {
    const result = await Notification.deleteMany({
      expiresAt: { $lt: new Date() }
    });

    if (result.deletedCount > 0) {
      logger.info(`Cleaned up ${result.deletedCount} expired notifications`);
    }

    return result.deletedCount;
  } catch (error) {
    logger.error('Error cleaning up expired notifications:', error);
    throw error;
  }
}
