import { Schema, model, Document, Types } from 'mongoose';

export interface IAnalyticsEvent extends Document {
  _id: Types.ObjectId;
  userId?: Types.ObjectId;
  sessionId?: string;
  eventType: string;
  eventCategory: 'engagement' | 'performance' | 'behavior' | 'system';
  eventData: any;
  metadata: {
    platform?: string;
    deviceId?: string;
    appVersion?: string;
    userAgent?: string;
    ipAddress?: string;
  };
  timestamp: Date;
  createdAt: Date;
}

const AnalyticsEventSchema = new Schema<IAnalyticsEvent>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    sessionId: {
      type: String,
      index: true
    },
    eventType: {
      type: String,
      required: true,
      index: true
    },
    eventCategory: {
      type: String,
      enum: ['engagement', 'performance', 'behavior', 'system'],
      required: true,
      index: true
    },
    eventData: {
      type: Schema.Types.Mixed,
      required: true
    },
    metadata: {
      platform: String,
      deviceId: String,
      appVersion: String,
      userAgent: String,
      ipAddress: String
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'analytics_events'
  }
);

// Compound indexes for common queries
AnalyticsEventSchema.index({ userId: 1, timestamp: -1 });
AnalyticsEventSchema.index({ eventType: 1, timestamp: -1 });
AnalyticsEventSchema.index({ eventCategory: 1, timestamp: -1 });
AnalyticsEventSchema.index({ timestamp: -1 }); // For time-series queries

const AnalyticsEvent = model<IAnalyticsEvent>('AnalyticsEvent', AnalyticsEventSchema);

export default AnalyticsEvent;

// Analytics Aggregation Model
export interface IAnalyticsAggregate extends Document {
  _id: Types.ObjectId;
  aggregateType: 'user_daily' | 'course_daily' | 'system_hourly' | 'leaderboard_daily';
  aggregateKey: string; // userId, courseId, or 'global'
  period: {
    start: Date;
    end: Date;
    granularity: 'hour' | 'day' | 'week' | 'month';
  };
  metrics: {
    // Engagement metrics
    activeUsers?: number;
    sessionsCount?: number;
    avgSessionDuration?: number;

    // Learning metrics
    lessonsStarted?: number;
    lessonsCompleted?: number;
    quizzesTaken?: number;
    quizzesPassed?: number;
    avgQuizScore?: number;

    // Gamification metrics
    xpEarned?: number;
    achievementsUnlocked?: number;
    streakDays?: number;

    // System metrics
    apiCalls?: number;
    errors?: number;
    avgResponseTime?: number;

    // Custom metrics
    custom?: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

const AnalyticsAggregateSchema = new Schema<IAnalyticsAggregate>(
  {
    aggregateType: {
      type: String,
      enum: ['user_daily', 'course_daily', 'system_hourly', 'leaderboard_daily'],
      required: true,
      index: true
    },
    aggregateKey: {
      type: String,
      required: true,
      index: true
    },
    period: {
      start: {
        type: Date,
        required: true,
        index: true
      },
      end: {
        type: Date,
        required: true
      },
      granularity: {
        type: String,
        enum: ['hour', 'day', 'week', 'month'],
        required: true
      }
    },
    metrics: {
      // Engagement
      activeUsers: Number,
      sessionsCount: Number,
      avgSessionDuration: Number,

      // Learning
      lessonsStarted: Number,
      lessonsCompleted: Number,
      quizzesTaken: Number,
      quizzesPassed: Number,
      avgQuizScore: Number,

      // Gamification
      xpEarned: Number,
      achievementsUnlocked: Number,
      streakDays: Number,

      // System
      apiCalls: Number,
      errors: Number,
      avgResponseTime: Number,

      // Custom
      custom: Schema.Types.Mixed
    }
  },
  {
    timestamps: true,
    collection: 'analytics_aggregates'
  }
);

// Compound indexes for efficient queries
AnalyticsAggregateSchema.index({ aggregateType: 1, aggregateKey: 1, 'period.start': -1 });
AnalyticsAggregateSchema.index({ aggregateType: 1, 'period.start': -1 });

// Unique constraint to prevent duplicate aggregates
AnalyticsAggregateSchema.index(
  { aggregateType: 1, aggregateKey: 1, 'period.start': 1, 'period.granularity': 1 },
  { unique: true }
);

const AnalyticsAggregate = model<IAnalyticsAggregate>(
  'AnalyticsAggregate',
  AnalyticsAggregateSchema
);

export { AnalyticsAggregate };
