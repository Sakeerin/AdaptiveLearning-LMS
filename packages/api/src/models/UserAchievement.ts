import { Schema, model, Document, Types } from 'mongoose';

export interface IUserAchievement extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  achievementId: Types.ObjectId;
  earnedAt: Date;
  progress?: number;
  notified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserAchievementSchema = new Schema<IUserAchievement>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    achievementId: {
      type: Schema.Types.ObjectId,
      ref: 'Achievement',
      required: true,
      index: true
    },
    earnedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    progress: {
      type: Number,
      min: 0,
      max: 100
    },
    notified: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    collection: 'user_achievements'
  }
);

// Compound index to prevent duplicate achievements
UserAchievementSchema.index({ userId: 1, achievementId: 1 }, { unique: true });
UserAchievementSchema.index({ userId: 1, earnedAt: -1 });

const UserAchievement = model<IUserAchievement>('UserAchievement', UserAchievementSchema);

export default UserAchievement;
