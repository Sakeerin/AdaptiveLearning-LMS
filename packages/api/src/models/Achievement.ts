import { Schema, model, Document, Types } from 'mongoose';

export interface IAchievement extends Document {
  _id: Types.ObjectId;
  key: string;
  type: 'badge' | 'milestone' | 'streak' | 'mastery';
  name: { th: string; en: string };
  description: { th: string; en: string };
  icon: string;
  criteria: {
    metric: 'xp' | 'lessons_completed' | 'quizzes_passed' | 'streak_days' | 'mastery_avg' | 'perfect_quizzes';
    threshold: number;
    timeframe?: 'daily' | 'weekly' | 'monthly' | 'all-time';
  };
  reward: {
    xp: number;
    points: number;
  };
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AchievementSchema = new Schema<IAchievement>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    type: {
      type: String,
      enum: ['badge', 'milestone', 'streak', 'mastery'],
      required: true
    },
    name: {
      th: { type: String, required: true },
      en: { type: String, required: true }
    },
    description: {
      th: { type: String, required: true },
      en: { type: String, required: true }
    },
    icon: {
      type: String,
      required: true
    },
    criteria: {
      metric: {
        type: String,
        enum: ['xp', 'lessons_completed', 'quizzes_passed', 'streak_days', 'mastery_avg', 'perfect_quizzes'],
        required: true
      },
      threshold: {
        type: Number,
        required: true,
        min: 0
      },
      timeframe: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'all-time']
      }
    },
    reward: {
      xp: {
        type: Number,
        required: true,
        min: 0,
        default: 0
      },
      points: {
        type: Number,
        required: true,
        min: 0,
        default: 0
      }
    },
    tier: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum']
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    collection: 'achievements'
  }
);

// Indexes for efficient queries
AchievementSchema.index({ type: 1, isActive: 1 });
AchievementSchema.index({ 'criteria.metric': 1 });

const Achievement = model<IAchievement>('Achievement', AchievementSchema);

export default Achievement;
