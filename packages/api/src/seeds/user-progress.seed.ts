/**
 * User Progress Seed Data
 *
 * Creates progress records for demo users including:
 * - Learner mastery
 * - Quiz attempts
 * - Gamification stats
 * - Achievements
 */

import mongoose from 'mongoose';
import { LearnerMastery } from '../models/LearnerMastery';
import { LearnerProgress } from '../models/LearnerProgress';
import { QuizAttempt } from '../models/QuizAttempt';
import { UserGameStats } from '../models/UserGameStats';
import { UserAchievement } from '../models/UserAchievement';
import { Achievement } from '../models/Achievement';

interface SeedResult {
  count: number;
}

export async function seedUserProgress(
  userIds: Record<string, mongoose.Types.ObjectId>,
  courseIds: Record<string, mongoose.Types.ObjectId>,
  competencyIds: Record<string, mongoose.Types.ObjectId>,
  lessonIds: Record<string, mongoose.Types.ObjectId>,
  quizIds: Record<string, mongoose.Types.ObjectId>
): Promise<SeedResult> {
  let totalCount = 0;

  // Get learner user IDs
  const learner1 = userIds.learner1;
  const learner2 = userIds.learner2;
  const learner3 = userIds.learner3;
  const student1 = userIds.student1_school;
  const student2 = userIds.student2_school;

  const learners = [learner1, learner2, learner3, student1, student2].filter(Boolean);

  if (learners.length === 0) {
    console.log('   Warning: No learner users found');
    return { count: 0 };
  }

  // ==================== Learner Mastery ====================
  const masteryRecords = [];

  // Learner 1 (Beginner) - Low mastery
  if (learner1 && competencyIds.JS_VARS) {
    masteryRecords.push({
      userId: learner1,
      competencyId: competencyIds.JS_VARS,
      masteryLevel: 0.45,
      confidence: 0.6,
      assessmentHistory: [
        { score: 0.4, assessedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        { score: 0.5, assessedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
      ],
      lastAssessed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    });
  }

  if (learner1 && competencyIds.JS_TYPES) {
    masteryRecords.push({
      userId: learner1,
      competencyId: competencyIds.JS_TYPES,
      masteryLevel: 0.35,
      confidence: 0.5,
      assessmentHistory: [
        { score: 0.35, assessedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
      ],
      lastAssessed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    });
  }

  // Learner 2 (Intermediate) - Medium mastery
  if (learner2 && competencyIds.JS_VARS) {
    masteryRecords.push({
      userId: learner2,
      competencyId: competencyIds.JS_VARS,
      masteryLevel: 0.85,
      confidence: 0.9,
      assessmentHistory: [
        { score: 0.7, assessedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
        { score: 0.85, assessedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      ],
      lastAssessed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    });
  }

  if (learner2 && competencyIds.JS_TYPES) {
    masteryRecords.push({
      userId: learner2,
      competencyId: competencyIds.JS_TYPES,
      masteryLevel: 0.80,
      confidence: 0.85,
      assessmentHistory: [
        { score: 0.8, assessedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
      ],
      lastAssessed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    });
  }

  if (learner2 && competencyIds.JS_OPS) {
    masteryRecords.push({
      userId: learner2,
      competencyId: competencyIds.JS_OPS,
      masteryLevel: 0.70,
      confidence: 0.75,
      assessmentHistory: [
        { score: 0.7, assessedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
      ],
      lastAssessed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    });
  }

  if (learner2 && competencyIds.JS_COND) {
    masteryRecords.push({
      userId: learner2,
      competencyId: competencyIds.JS_COND,
      masteryLevel: 0.65,
      confidence: 0.7,
      assessmentHistory: [
        { score: 0.65, assessedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
      ],
      lastAssessed: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    });
  }

  // Learner 3 (Advanced) - High mastery
  if (learner3) {
    const advancedCompetencies = [
      competencyIds.JS_VARS,
      competencyIds.JS_TYPES,
      competencyIds.JS_OPS,
      competencyIds.JS_COND,
      competencyIds.JS_LOOPS,
      competencyIds.JS_FUNC,
    ].filter(Boolean);

    for (const compId of advancedCompetencies) {
      masteryRecords.push({
        userId: learner3,
        competencyId: compId,
        masteryLevel: 0.90 + Math.random() * 0.1,
        confidence: 0.95,
        assessmentHistory: [
          { score: 0.85, assessedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000) },
          { score: 0.95, assessedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        ],
        lastAssessed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      });
    }
  }

  if (masteryRecords.length > 0) {
    await LearnerMastery.insertMany(masteryRecords);
    totalCount += masteryRecords.length;
  }

  // ==================== Learner Progress (Lesson Progress) ====================
  const progressRecords = [];
  const lessonList = Object.values(lessonIds).filter(Boolean);

  for (const learner of [learner1, learner2, learner3].filter(Boolean)) {
    // Simulate varying progress per learner
    const completionRate = learner === learner3 ? 0.8 : learner === learner2 ? 0.5 : 0.2;
    const lessonsToComplete = Math.floor(lessonList.length * completionRate);

    for (let i = 0; i < lessonsToComplete && i < lessonList.length; i++) {
      progressRecords.push({
        userId: learner,
        lessonId: lessonList[i],
        completionPercentage: 100,
        timeSpent: Math.floor(Math.random() * 30 + 10) * 60, // 10-40 minutes in seconds
        lastAccessed: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000),
      });
    }

    // Add one in-progress lesson
    if (lessonsToComplete < lessonList.length) {
      progressRecords.push({
        userId: learner,
        lessonId: lessonList[lessonsToComplete],
        completionPercentage: Math.floor(Math.random() * 70 + 10),
        timeSpent: Math.floor(Math.random() * 15 + 5) * 60,
        lastAccessed: new Date(),
      });
    }
  }

  if (progressRecords.length > 0) {
    await LearnerProgress.insertMany(progressRecords);
    totalCount += progressRecords.length;
  }

  // ==================== Quiz Attempts ====================
  const quizAttempts = [];
  const quizList = Object.values(quizIds).filter(Boolean);

  if (quizList.length > 0) {
    // Learner 2 and 3 have quiz attempts
    for (const learner of [learner2, learner3].filter(Boolean)) {
      for (const quizId of quizList) {
        const isAdvanced = learner === learner3;
        const score = isAdvanced ? 85 + Math.floor(Math.random() * 15) : 60 + Math.floor(Math.random() * 25);

        quizAttempts.push({
          userId: learner,
          quizId: quizId,
          startedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
          completedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000),
          answers: [], // Would normally have actual answers
          score: score,
          passed: score >= 70,
          timeSpent: Math.floor(Math.random() * 10 + 5) * 60, // 5-15 minutes
          attemptNumber: 1,
        });
      }
    }

    if (quizAttempts.length > 0) {
      await QuizAttempt.insertMany(quizAttempts);
      totalCount += quizAttempts.length;
    }
  }

  // ==================== Gamification Stats ====================
  const gameStats = [];

  const statsData = [
    { userId: learner1, xp: 250, level: 2, points: 150, streak: 3 },
    { userId: learner2, xp: 1500, level: 5, points: 800, streak: 7 },
    { userId: learner3, xp: 4500, level: 8, points: 2500, streak: 15 },
    { userId: student1, xp: 800, level: 3, points: 400, streak: 5 },
    { userId: student2, xp: 600, level: 3, points: 300, streak: 2 },
  ].filter(s => s.userId);

  for (const data of statsData) {
    gameStats.push({
      userId: data.userId,
      xp: data.xp,
      level: data.level,
      points: data.points,
      currentStreak: data.streak,
      longestStreak: data.streak + Math.floor(Math.random() * 5),
      lastActivityDate: new Date(),
      stats: {
        lessonsCompleted: Math.floor(data.xp / 100),
        quizzesCompleted: Math.floor(data.xp / 200),
        quizzesPassed: Math.floor(data.xp / 250),
        totalTimeSpent: data.xp * 3,
        averageQuizScore: 70 + Math.floor(Math.random() * 25),
      },
    });
  }

  if (gameStats.length > 0) {
    await UserGameStats.insertMany(gameStats);
    totalCount += gameStats.length;
  }

  // ==================== User Achievements ====================
  const achievements = await Achievement.find({}).lean();

  if (achievements.length > 0) {
    const userAchievements = [];

    // Learner 3 has many achievements
    if (learner3) {
      const achievementsToAward = achievements.slice(0, 8);
      for (const achievement of achievementsToAward) {
        userAchievements.push({
          userId: learner3,
          achievementId: achievement._id,
          earnedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          progress: achievement.requirements?.count || 1,
          notified: true,
        });
      }
    }

    // Learner 2 has some achievements
    if (learner2) {
      const achievementsToAward = achievements.slice(0, 4);
      for (const achievement of achievementsToAward) {
        userAchievements.push({
          userId: learner2,
          achievementId: achievement._id,
          earnedAt: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000),
          progress: achievement.requirements?.count || 1,
          notified: true,
        });
      }
    }

    // Learner 1 has starter achievements
    if (learner1) {
      const achievementsToAward = achievements.slice(0, 2);
      for (const achievement of achievementsToAward) {
        userAchievements.push({
          userId: learner1,
          achievementId: achievement._id,
          earnedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
          progress: achievement.requirements?.count || 1,
          notified: false, // Unread notification
        });
      }
    }

    if (userAchievements.length > 0) {
      await UserAchievement.insertMany(userAchievements);
      totalCount += userAchievements.length;
    }
  }

  return {
    count: totalCount,
  };
}
