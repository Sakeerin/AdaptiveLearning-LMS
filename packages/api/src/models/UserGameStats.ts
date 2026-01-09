import { Schema, model, Document, Types } from 'mongoose';

export interface IUserGameStats extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  xp: number;
  level: number;
  points: number;
  streak: {
    current: number;
    longest: number;
    lastActivityDate: Date;
  };
  stats: {
    lessonsCompleted: number;
    quizzesPassed: number;
    perfectQuizzes: number;
    totalStudyTime: number;
    averageMastery: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserGameStatsSchema = new Schema<IUserGameStats>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    xp: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    level: {
      type: Number,
      required: true,
      default: 1,
      min: 1
    },
    points: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    streak: {
      current: {
        type: Number,
        default: 0,
        min: 0
      },
      longest: {
        type: Number,
        default: 0,
        min: 0
      },
      lastActivityDate: {
        type: Date
      }
    },
    stats: {
      lessonsCompleted: {
        type: Number,
        default: 0,
        min: 0
      },
      quizzesPassed: {
        type: Number,
        default: 0,
        min: 0
      },
      perfectQuizzes: {
        type: Number,
        default: 0,
        min: 0
      },
      totalStudyTime: {
        type: Number,
        default: 0,
        min: 0
      },
      averageMastery: {
        type: Number,
        default: 0,
        min: 0,
        max: 1
      }
    }
  },
  {
    timestamps: true,
    collection: 'user_game_stats'
  }
);

// Indexes for leaderboards
UserGameStatsSchema.index({ xp: -1 });
UserGameStatsSchema.index({ points: -1 });
UserGameStatsSchema.index({ 'streak.current': -1 });
UserGameStatsSchema.index({ level: -1 });

// Static method to calculate level from XP
UserGameStatsSchema.statics.calculateLevel = function(xp: number): number {
  // Level formula: level = floor(sqrt(xp / 100)) + 1
  // Level 1: 0-99 XP
  // Level 2: 100-399 XP
  // Level 3: 400-899 XP
  // Level 4: 900-1599 XP
  // etc.
  return Math.floor(Math.sqrt(xp / 100)) + 1;
};

// Static method to calculate XP needed for next level
UserGameStatsSchema.statics.xpForNextLevel = function(currentLevel: number): number {
  // XP needed = (level^2) * 100
  return currentLevel * currentLevel * 100;
};

// Instance method to add XP and update level
UserGameStatsSchema.methods.addXP = async function(amount: number): Promise<void> {
  this.xp += amount;
  const newLevel = (this.constructor as any).calculateLevel(this.xp);
  if (newLevel > this.level) {
    this.level = newLevel;
  }
  await this.save();
};

// Instance method to update streak
UserGameStatsSchema.methods.updateStreak = async function(): Promise<boolean> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!this.streak.lastActivityDate) {
    // First activity ever
    this.streak.current = 1;
    this.streak.longest = 1;
    this.streak.lastActivityDate = today;
    await this.save();
    return true;
  }

  const lastActivity = new Date(this.streak.lastActivityDate);
  lastActivity.setHours(0, 0, 0, 0);

  const daysDiff = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff === 0) {
    // Same day, no change
    return false;
  } else if (daysDiff === 1) {
    // Consecutive day
    this.streak.current += 1;
    if (this.streak.current > this.streak.longest) {
      this.streak.longest = this.streak.current;
    }
    this.streak.lastActivityDate = today;
    await this.save();
    return true;
  } else {
    // Streak broken
    this.streak.current = 1;
    this.streak.lastActivityDate = today;
    await this.save();
    return true;
  }
};

const UserGameStats = model<IUserGameStats>('UserGameStats', UserGameStatsSchema);

export default UserGameStats;
