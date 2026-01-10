import UserGameStats from '../models/UserGameStats';
import Achievement from '../models/Achievement';
import UserAchievement from '../models/UserAchievement';
import LeaderboardEntry from '../models/Leaderboard';
import LearnerProgress from '../models/LearnerProgress';
import QuizAttempt from '../models/QuizAttempt';
import CompetencyMastery from '../models/CompetencyMastery';
import { logger } from '../utils/logger';
import { Types } from 'mongoose';

// XP Rewards
export const XP_REWARDS = {
  LESSON_COMPLETED: 50,
  QUIZ_PASSED: 100,
  QUIZ_PERFECT: 150,
  FIRST_LESSON: 25,
  DAILY_LOGIN: 10,
  STREAK_BONUS_PER_DAY: 5
};

// Points Rewards
export const POINTS_REWARDS = {
  LESSON_COMPLETED: 10,
  QUIZ_PASSED: 20,
  QUIZ_PERFECT: 30,
  ACHIEVEMENT_EARNED: 50
};

/**
 * Initialize game stats for a new user
 */
export async function initializeUserGameStats(userId: string): Promise<any> {
  try {
    const existingStats = await UserGameStats.findOne({ userId: new Types.ObjectId(userId) });
    if (existingStats) {
      return existingStats;
    }

    const stats = new UserGameStats({
      userId: new Types.ObjectId(userId),
      xp: 0,
      level: 1,
      points: 0,
      streak: {
        current: 0,
        longest: 0
      },
      stats: {
        lessonsCompleted: 0,
        quizzesPassed: 0,
        perfectQuizzes: 0,
        totalStudyTime: 0,
        averageMastery: 0
      }
    });

    await stats.save();
    logger.info(`Initialized game stats for user ${userId}`);
    return stats;
  } catch (error) {
    logger.error('Error initializing user game stats:', error);
    throw error;
  }
}

/**
 * Award XP and points to a user
 */
export async function awardXPAndPoints(
  userId: string,
  xp: number,
  points: number,
  reason: string
): Promise<{ newXP: number; newLevel: number; leveledUp: boolean; newPoints: number }> {
  try {
    let stats = await UserGameStats.findOne({ userId: new Types.ObjectId(userId) });
    if (!stats) {
      stats = await initializeUserGameStats(userId);
    }

    const oldLevel = stats.level;
    const oldXP = stats.xp;

    // Add XP and update level
    await stats.addXP(xp);

    // Add points
    stats.points += points;
    await stats.save();

    const leveledUp = stats.level > oldLevel;

    // Send level up notification
    if (leveledUp) {
      try {
        const { notifyLevelUp } = await import('./notification.service');
        await notifyLevelUp(userId, stats.level, stats.xp);
      } catch (error) {
        logger.error('Failed to send level up notification:', error);
      }
    }

    logger.info(
      `Awarded ${xp} XP and ${points} points to user ${userId} for ${reason}. ` +
      `Level: ${oldLevel} -> ${stats.level}, XP: ${oldXP} -> ${stats.xp}`
    );

    return {
      newXP: stats.xp,
      newLevel: stats.level,
      leveledUp,
      newPoints: stats.points
    };
  } catch (error) {
    logger.error('Error awarding XP and points:', error);
    throw error;
  }
}

/**
 * Update streak for a user
 */
export async function updateUserStreak(userId: string): Promise<{ current: number; longest: number; updated: boolean }> {
  try {
    let stats = await UserGameStats.findOne({ userId: new Types.ObjectId(userId) });
    if (!stats) {
      stats = await initializeUserGameStats(userId);
    }

    const updated = await stats.updateStreak();

    // Award streak bonus XP if streak was updated
    if (updated && stats.streak.current > 1) {
      const bonusXP = stats.streak.current * XP_REWARDS.STREAK_BONUS_PER_DAY;
      await stats.addXP(bonusXP);
      logger.info(`Awarded ${bonusXP} streak bonus XP to user ${userId} (${stats.streak.current} day streak)`);
    }

    return {
      current: stats.streak.current,
      longest: stats.streak.longest,
      updated
    };
  } catch (error) {
    logger.error('Error updating user streak:', error);
    throw error;
  }
}

/**
 * Handle lesson completion event
 */
export async function handleLessonCompletion(
  userId: string,
  lessonId: string,
  timeSpent: number
): Promise<{ xp: number; points: number; achievements: any[] }> {
  try {
    // Update stats
    let stats = await UserGameStats.findOne({ userId: new Types.ObjectId(userId) });
    if (!stats) {
      stats = await initializeUserGameStats(userId);
    }

    stats.stats.lessonsCompleted += 1;
    stats.stats.totalStudyTime += timeSpent;
    await stats.save();

    // Update streak
    await updateUserStreak(userId);

    // Award XP and points
    const isFirstLesson = stats.stats.lessonsCompleted === 1;
    const xp = XP_REWARDS.LESSON_COMPLETED + (isFirstLesson ? XP_REWARDS.FIRST_LESSON : 0);
    const points = POINTS_REWARDS.LESSON_COMPLETED;

    await awardXPAndPoints(userId, xp, points, `lesson completion (${lessonId})`);

    // Check for new achievements
    const newAchievements = await checkAndAwardAchievements(userId);

    logger.info(`Handled lesson completion for user ${userId}: +${xp} XP, +${points} points, ${newAchievements.length} new achievements`);

    return { xp, points, achievements: newAchievements };
  } catch (error) {
    logger.error('Error handling lesson completion:', error);
    throw error;
  }
}

/**
 * Handle quiz completion event
 */
export async function handleQuizCompletion(
  userId: string,
  quizId: string,
  passed: boolean,
  isPerfect: boolean
): Promise<{ xp: number; points: number; achievements: any[] }> {
  try {
    // Update stats
    let stats = await UserGameStats.findOne({ userId: new Types.ObjectId(userId) });
    if (!stats) {
      stats = await initializeUserGameStats(userId);
    }

    if (passed) {
      stats.stats.quizzesPassed += 1;
      if (isPerfect) {
        stats.stats.perfectQuizzes += 1;
      }
      await stats.save();
    }

    // Update streak
    await updateUserStreak(userId);

    // Award XP and points
    let xp = 0;
    let points = 0;

    if (passed) {
      xp = isPerfect ? XP_REWARDS.QUIZ_PERFECT : XP_REWARDS.QUIZ_PASSED;
      points = isPerfect ? POINTS_REWARDS.QUIZ_PERFECT : POINTS_REWARDS.QUIZ_PASSED;
      await awardXPAndPoints(userId, xp, points, `quiz completion (${quizId})`);
    }

    // Check for new achievements
    const newAchievements = await checkAndAwardAchievements(userId);

    logger.info(`Handled quiz completion for user ${userId}: passed=${passed}, perfect=${isPerfect}, +${xp} XP, +${points} points`);

    return { xp, points, achievements: newAchievements };
  } catch (error) {
    logger.error('Error handling quiz completion:', error);
    throw error;
  }
}

/**
 * Check and award achievements based on current stats
 */
export async function checkAndAwardAchievements(userId: string): Promise<any[]> {
  try {
    const stats = await UserGameStats.findOne({ userId: new Types.ObjectId(userId) });
    if (!stats) {
      return [];
    }

    // Get all active achievements
    const achievements = await Achievement.find({ isActive: true });

    // Get already earned achievements
    const earnedAchievements = await UserAchievement.find({ userId: new Types.ObjectId(userId) });
    const earnedAchievementIds = new Set(earnedAchievements.map(ua => ua.achievementId.toString()));

    const newlyEarned: any[] = [];

    for (const achievement of achievements) {
      // Skip if already earned
      if (earnedAchievementIds.has(achievement._id.toString())) {
        continue;
      }

      // Check if criteria met
      let currentValue = 0;
      switch (achievement.criteria.metric) {
        case 'xp':
          currentValue = stats.xp;
          break;
        case 'lessons_completed':
          currentValue = stats.stats.lessonsCompleted;
          break;
        case 'quizzes_passed':
          currentValue = stats.stats.quizzesPassed;
          break;
        case 'streak_days':
          currentValue = stats.streak.current;
          break;
        case 'perfect_quizzes':
          currentValue = stats.stats.perfectQuizzes;
          break;
        case 'mastery_avg':
          currentValue = stats.stats.averageMastery * 100; // Convert to percentage
          break;
      }

      if (currentValue >= achievement.criteria.threshold) {
        // Award achievement
        const userAchievement = new UserAchievement({
          userId: new Types.ObjectId(userId),
          achievementId: achievement._id,
          earnedAt: new Date(),
          progress: 100,
          notified: false
        });

        await userAchievement.save();

        // Award achievement rewards
        if (achievement.reward.xp > 0 || achievement.reward.points > 0) {
          await awardXPAndPoints(
            userId,
            achievement.reward.xp,
            achievement.reward.points,
            `achievement earned: ${achievement.key}`
          );
        }

        newlyEarned.push({
          achievement,
          earnedAt: userAchievement.earnedAt
        });

        // Send achievement notification
        try {
          const { notifyAchievementEarned } = await import('./notification.service');
          await notifyAchievementEarned(userId, achievement);
        } catch (error) {
          logger.error('Failed to send achievement notification:', error);
        }

        logger.info(`User ${userId} earned achievement: ${achievement.key}`);
      }
    }

    return newlyEarned;
  } catch (error) {
    logger.error('Error checking and awarding achievements:', error);
    throw error;
  }
}

/**
 * Get user's game stats
 */
export async function getUserGameStats(userId: string): Promise<any> {
  try {
    let stats = await UserGameStats.findOne({ userId: new Types.ObjectId(userId) });
    if (!stats) {
      stats = await initializeUserGameStats(userId);
    }

    // Calculate average mastery
    const masteries = await CompetencyMastery.find({ userId: new Types.ObjectId(userId) });
    if (masteries.length > 0) {
      const avgMastery = masteries.reduce((sum, m) => sum + m.masteryLevel, 0) / masteries.length;
      stats.stats.averageMastery = avgMastery;
      await stats.save();
    }

    // Calculate XP needed for next level
    const xpForNextLevel = (UserGameStats as any).xpForNextLevel(stats.level);
    const xpProgress = stats.xp - ((stats.level - 1) * (stats.level - 1) * 100);

    return {
      userId: stats.userId,
      xp: stats.xp,
      level: stats.level,
      xpForNextLevel,
      xpProgress,
      points: stats.points,
      streak: stats.streak,
      stats: stats.stats
    };
  } catch (error) {
    logger.error('Error getting user game stats:', error);
    throw error;
  }
}

/**
 * Get user's achievements
 */
export async function getUserAchievements(userId: string): Promise<any[]> {
  try {
    const userAchievements = await UserAchievement.find({ userId: new Types.ObjectId(userId) })
      .populate('achievementId')
      .sort({ earnedAt: -1 });

    return userAchievements.map(ua => ({
      achievement: ua.achievementId,
      earnedAt: ua.earnedAt,
      progress: ua.progress
    }));
  } catch (error) {
    logger.error('Error getting user achievements:', error);
    throw error;
  }
}

/**
 * Get leaderboard
 */
export async function getLeaderboard(
  metric: 'xp' | 'points' | 'streak',
  period: 'daily' | 'weekly' | 'monthly' | 'all-time',
  limit: number = 100,
  courseId?: string
): Promise<any[]> {
  try {
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date = now;

    // Calculate period boundaries
    switch (period) {
      case 'daily':
        periodStart = new Date(now);
        periodStart.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        periodStart = new Date(now);
        periodStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
        periodStart.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'all-time':
        periodStart = new Date(0); // Beginning of time
        break;
    }

    // For all-time, get from UserGameStats directly
    if (period === 'all-time') {
      const sortField = metric === 'streak' ? 'streak.current' : metric;
      const leaderboard = await UserGameStats.find()
        .sort({ [sortField]: -1 })
        .limit(limit)
        .populate('userId', 'name email profilePicture')
        .lean();

      return leaderboard.map((entry, index) => ({
        rank: index + 1,
        user: entry.userId,
        value: metric === 'streak' ? entry.streak.current : (entry as any)[metric],
        level: entry.level
      }));
    }

    // For other periods, use LeaderboardEntry (would be populated by a cron job)
    const scope = courseId ? 'course' : 'global';
    const query: any = {
      scope,
      metric,
      period,
      periodStart: { $gte: periodStart },
      periodEnd: { $lte: periodEnd }
    };

    if (courseId) {
      query.courseId = new Types.ObjectId(courseId);
    }

    const entries = await LeaderboardEntry.find(query)
      .sort({ rank: 1 })
      .limit(limit)
      .populate('userId', 'name email profilePicture')
      .lean();

    return entries.map(entry => ({
      rank: entry.rank,
      user: entry.userId,
      value: entry.value
    }));
  } catch (error) {
    logger.error('Error getting leaderboard:', error);
    throw error;
  }
}

/**
 * Get user's rank in leaderboard
 */
export async function getUserRank(
  userId: string,
  metric: 'xp' | 'points' | 'streak',
  period: 'all-time' = 'all-time'
): Promise<{ rank: number; value: number; total: number }> {
  try {
    const stats = await UserGameStats.findOne({ userId: new Types.ObjectId(userId) });
    if (!stats) {
      return { rank: 0, value: 0, total: 0 };
    }

    const userValue = metric === 'streak' ? stats.streak.current : (stats as any)[metric];

    // Count users with higher value
    const sortField = metric === 'streak' ? 'streak.current' : metric;
    const higherCount = await UserGameStats.countDocuments({
      [sortField]: { $gt: userValue }
    });

    const total = await UserGameStats.countDocuments();

    return {
      rank: higherCount + 1,
      value: userValue,
      total
    };
  } catch (error) {
    logger.error('Error getting user rank:', error);
    throw error;
  }
}
