import Achievement from '../models/Achievement';
import { logger } from '../utils/logger';

const defaultAchievements = [
  // XP Milestones
  {
    key: 'xp_bronze',
    type: 'milestone',
    name: {
      th: 'นักเรียนมือใหม่',
      en: 'Novice Learner'
    },
    description: {
      th: 'รับ 1,000 XP',
      en: 'Earn 1,000 XP'
    },
    icon: '🥉',
    criteria: {
      metric: 'xp',
      threshold: 1000,
      timeframe: 'all-time'
    },
    reward: {
      xp: 100,
      points: 50
    },
    tier: 'bronze',
    isActive: true
  },
  {
    key: 'xp_silver',
    type: 'milestone',
    name: {
      th: 'นักเรียนฉลาด',
      en: 'Smart Learner'
    },
    description: {
      th: 'รับ 5,000 XP',
      en: 'Earn 5,000 XP'
    },
    icon: '🥈',
    criteria: {
      metric: 'xp',
      threshold: 5000,
      timeframe: 'all-time'
    },
    reward: {
      xp: 500,
      points: 250
    },
    tier: 'silver',
    isActive: true
  },
  {
    key: 'xp_gold',
    type: 'milestone',
    name: {
      th: 'นักเรียนเก่ง',
      en: 'Expert Learner'
    },
    description: {
      th: 'รับ 10,000 XP',
      en: 'Earn 10,000 XP'
    },
    icon: '🥇',
    criteria: {
      metric: 'xp',
      threshold: 10000,
      timeframe: 'all-time'
    },
    reward: {
      xp: 1000,
      points: 500
    },
    tier: 'gold',
    isActive: true
  },
  {
    key: 'xp_platinum',
    type: 'milestone',
    name: {
      th: 'นักเรียนชั้นยอด',
      en: 'Master Learner'
    },
    description: {
      th: 'รับ 25,000 XP',
      en: 'Earn 25,000 XP'
    },
    icon: '💎',
    criteria: {
      metric: 'xp',
      threshold: 25000,
      timeframe: 'all-time'
    },
    reward: {
      xp: 2500,
      points: 1000
    },
    tier: 'platinum',
    isActive: true
  },

  // Lesson Completion
  {
    key: 'lessons_5',
    type: 'badge',
    name: {
      th: 'ก้าวแรก',
      en: 'First Steps'
    },
    description: {
      th: 'จบบทเรียน 5 บทเรียน',
      en: 'Complete 5 lessons'
    },
    icon: '📚',
    criteria: {
      metric: 'lessons_completed',
      threshold: 5,
      timeframe: 'all-time'
    },
    reward: {
      xp: 100,
      points: 50
    },
    tier: 'bronze',
    isActive: true
  },
  {
    key: 'lessons_25',
    type: 'badge',
    name: {
      th: 'นักอ่าน',
      en: 'Avid Reader'
    },
    description: {
      th: 'จบบทเรียน 25 บทเรียน',
      en: 'Complete 25 lessons'
    },
    icon: '📖',
    criteria: {
      metric: 'lessons_completed',
      threshold: 25,
      timeframe: 'all-time'
    },
    reward: {
      xp: 500,
      points: 250
    },
    tier: 'silver',
    isActive: true
  },
  {
    key: 'lessons_100',
    type: 'badge',
    name: {
      th: 'นักอ่านตัวยง',
      en: 'Bookworm'
    },
    description: {
      th: 'จบบทเรียน 100 บทเรียน',
      en: 'Complete 100 lessons'
    },
    icon: '🐛',
    criteria: {
      metric: 'lessons_completed',
      threshold: 100,
      timeframe: 'all-time'
    },
    reward: {
      xp: 2000,
      points: 1000
    },
    tier: 'gold',
    isActive: true
  },

  // Quiz Performance
  {
    key: 'quiz_5',
    type: 'badge',
    name: {
      th: 'ผู้สอบผ่าน',
      en: 'Quiz Taker'
    },
    description: {
      th: 'สอบผ่าน 5 ควิซ',
      en: 'Pass 5 quizzes'
    },
    icon: '✅',
    criteria: {
      metric: 'quizzes_passed',
      threshold: 5,
      timeframe: 'all-time'
    },
    reward: {
      xp: 150,
      points: 75
    },
    tier: 'bronze',
    isActive: true
  },
  {
    key: 'quiz_25',
    type: 'badge',
    name: {
      th: 'ผู้เชี่ยวชาญควิซ',
      en: 'Quiz Expert'
    },
    description: {
      th: 'สอบผ่าน 25 ควิซ',
      en: 'Pass 25 quizzes'
    },
    icon: '🎯',
    criteria: {
      metric: 'quizzes_passed',
      threshold: 25,
      timeframe: 'all-time'
    },
    reward: {
      xp: 750,
      points: 375
    },
    tier: 'silver',
    isActive: true
  },
  {
    key: 'perfect_quiz_1',
    type: 'badge',
    name: {
      th: 'คะแนนเต็ม',
      en: 'Perfect Score'
    },
    description: {
      th: 'ทำควิซได้คะแนนเต็ม',
      en: 'Get a perfect score on a quiz'
    },
    icon: '💯',
    criteria: {
      metric: 'perfect_quizzes',
      threshold: 1,
      timeframe: 'all-time'
    },
    reward: {
      xp: 200,
      points: 100
    },
    tier: 'bronze',
    isActive: true
  },
  {
    key: 'perfect_quiz_10',
    type: 'badge',
    name: {
      th: 'ความสมบูรณ์แบบ',
      en: 'Perfectionist'
    },
    description: {
      th: 'ทำควิซได้คะแนนเต็ม 10 ครั้ง',
      en: 'Get perfect scores on 10 quizzes'
    },
    icon: '🌟',
    criteria: {
      metric: 'perfect_quizzes',
      threshold: 10,
      timeframe: 'all-time'
    },
    reward: {
      xp: 2000,
      points: 1000
    },
    tier: 'gold',
    isActive: true
  },

  // Streak Achievements
  {
    key: 'streak_3',
    type: 'streak',
    name: {
      th: 'นิสัยที่ดี',
      en: 'Good Habit'
    },
    description: {
      th: 'เรียน 3 วันติดต่อกัน',
      en: 'Study for 3 days in a row'
    },
    icon: '🔥',
    criteria: {
      metric: 'streak_days',
      threshold: 3,
      timeframe: 'all-time'
    },
    reward: {
      xp: 150,
      points: 75
    },
    tier: 'bronze',
    isActive: true
  },
  {
    key: 'streak_7',
    type: 'streak',
    name: {
      th: 'อาทิตย์แห่งความมุ่งมั่น',
      en: 'Week of Dedication'
    },
    description: {
      th: 'เรียน 7 วันติดต่อกัน',
      en: 'Study for 7 days in a row'
    },
    icon: '🔥🔥',
    criteria: {
      metric: 'streak_days',
      threshold: 7,
      timeframe: 'all-time'
    },
    reward: {
      xp: 350,
      points: 175
    },
    tier: 'silver',
    isActive: true
  },
  {
    key: 'streak_30',
    type: 'streak',
    name: {
      th: 'เดือนแห่งความเชี่ยวชาญ',
      en: 'Month of Mastery'
    },
    description: {
      th: 'เรียน 30 วันติดต่อกัน',
      en: 'Study for 30 days in a row'
    },
    icon: '🔥🔥🔥',
    criteria: {
      metric: 'streak_days',
      threshold: 30,
      timeframe: 'all-time'
    },
    reward: {
      xp: 1500,
      points: 750
    },
    tier: 'gold',
    isActive: true
  },
  {
    key: 'streak_100',
    type: 'streak',
    name: {
      th: 'ความมุ่งมั่นที่ไม่สะทกสะท้าน',
      en: 'Unstoppable'
    },
    description: {
      th: 'เรียน 100 วันติดต่อกัน',
      en: 'Study for 100 days in a row'
    },
    icon: '💪',
    criteria: {
      metric: 'streak_days',
      threshold: 100,
      timeframe: 'all-time'
    },
    reward: {
      xp: 5000,
      points: 2500
    },
    tier: 'platinum',
    isActive: true
  },

  // Mastery Achievements
  {
    key: 'mastery_50',
    type: 'mastery',
    name: {
      th: 'นักเรียนที่มั่นคง',
      en: 'Solid Student'
    },
    description: {
      th: 'ความชำนาญเฉลี่ย 50%',
      en: 'Reach 50% average mastery'
    },
    icon: '📊',
    criteria: {
      metric: 'mastery_avg',
      threshold: 50,
      timeframe: 'all-time'
    },
    reward: {
      xp: 500,
      points: 250
    },
    tier: 'bronze',
    isActive: true
  },
  {
    key: 'mastery_75',
    type: 'mastery',
    name: {
      th: 'ผู้เชี่ยวชาญ',
      en: 'Proficient'
    },
    description: {
      th: 'ความชำนาญเฉลี่ย 75%',
      en: 'Reach 75% average mastery'
    },
    icon: '📈',
    criteria: {
      metric: 'mastery_avg',
      threshold: 75,
      timeframe: 'all-time'
    },
    reward: {
      xp: 1000,
      points: 500
    },
    tier: 'silver',
    isActive: true
  },
  {
    key: 'mastery_90',
    type: 'mastery',
    name: {
      th: 'ผู้เชี่ยวชาญ',
      en: 'Master'
    },
    description: {
      th: 'ความชำนาญเฉลี่ย 90%',
      en: 'Reach 90% average mastery'
    },
    icon: '🎓',
    criteria: {
      metric: 'mastery_avg',
      threshold: 90,
      timeframe: 'all-time'
    },
    reward: {
      xp: 2500,
      points: 1250
    },
    tier: 'gold',
    isActive: true
  }
];

interface SeedResult {
  count: number;
}

export async function seedAchievements(): Promise<SeedResult> {
  try {
    let count = 0;

    for (const achievementData of defaultAchievements) {
      const existing = await Achievement.findOne({ key: achievementData.key });
      if (!existing) {
        const achievement = new Achievement(achievementData);
        await achievement.save();
        count++;
      }
    }

    return { count };
  } catch (error) {
    logger.error('Error seeding achievements:', error);
    throw error;
  }
}

// Run seed if executed directly
if (require.main === module) {
  const mongoose = require('mongoose');
  const dotenv = require('dotenv');

  dotenv.config();

  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/adaptive-lms';

  mongoose
    .connect(MONGODB_URI)
    .then(async () => {
      logger.info('Connected to MongoDB');
      await seedAchievements();
      await mongoose.disconnect();
      logger.info('Disconnected from MongoDB');
      process.exit(0);
    })
    .catch((error: any) => {
      logger.error('MongoDB connection error:', error);
      process.exit(1);
    });
}
