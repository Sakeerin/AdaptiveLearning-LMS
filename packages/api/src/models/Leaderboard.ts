import { Schema, model, Document, Types } from 'mongoose';

export interface ILeaderboardEntry extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  courseId?: Types.ObjectId;
  scope: 'global' | 'course';
  metric: 'xp' | 'points' | 'streak' | 'mastery';
  value: number;
  rank: number;
  period: 'daily' | 'weekly' | 'monthly' | 'all-time';
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LeaderboardEntrySchema = new Schema<ILeaderboardEntry>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course'
    },
    scope: {
      type: String,
      enum: ['global', 'course'],
      required: true
    },
    metric: {
      type: String,
      enum: ['xp', 'points', 'streak', 'mastery'],
      required: true
    },
    value: {
      type: Number,
      required: true,
      min: 0
    },
    rank: {
      type: Number,
      required: true,
      min: 1
    },
    period: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'all-time'],
      required: true
    },
    periodStart: {
      type: Date,
      required: true
    },
    periodEnd: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true,
    collection: 'leaderboard_entries'
  }
);

// Compound indexes for efficient leaderboard queries
LeaderboardEntrySchema.index({ scope: 1, metric: 1, period: 1, rank: 1 });
LeaderboardEntrySchema.index({ scope: 1, courseId: 1, metric: 1, period: 1, rank: 1 });
LeaderboardEntrySchema.index({ userId: 1, scope: 1, metric: 1, period: 1 });
LeaderboardEntrySchema.index({ periodEnd: 1 }); // For cleanup of old entries

// Compound unique index to prevent duplicates
LeaderboardEntrySchema.index(
  { userId: 1, scope: 1, courseId: 1, metric: 1, period: 1, periodStart: 1 },
  { unique: true }
);

const LeaderboardEntry = model<ILeaderboardEntry>('LeaderboardEntry', LeaderboardEntrySchema);

export default LeaderboardEntry;
