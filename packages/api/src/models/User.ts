import mongoose, { Schema, Document } from 'mongoose';
import { User as IUser, UserRole, Language } from '@adaptive-lms/shared';

export interface IUserDocument extends Omit<IUser, '_id'>, Document {}

const DeviceSessionSchema = new Schema({
  deviceId: { type: String, required: true },
  platform: { type: String, enum: ['web', 'ios', 'android'], required: true },
  lastActive: { type: Date, default: Date.now },
  pushToken: { type: String },
  token: { type: String, required: true }, // refresh token
}, { _id: false });

const UserProfileSchema = new Schema({
  displayName: { type: String, required: true },
  language: { type: String, enum: ['th', 'en'], default: 'th' },
  timezone: { type: String, default: 'Asia/Bangkok' },
  learningGoals: { type: String },
  initialSkillLevel: { type: Number, min: 1, max: 5 },
  dailyTimeBudgetMinutes: { type: Number, default: 30 },
  dailyReminderEnabled: { type: Boolean, default: true },
  leaderboardOptIn: { type: Boolean, default: false },
}, { _id: false });

const UserSchema = new Schema<IUserDocument>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
      message: 'Invalid email format',
    },
  },
  passwordHash: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['learner', 'author', 'admin'],
    default: 'learner',
  },
  profile: {
    type: UserProfileSchema,
    required: true,
  },
  sessions: {
    type: [DeviceSessionSchema],
    default: [],
  },
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      delete ret.passwordHash; // Never send password hash to client
      return ret;
    },
  },
});

// Indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ 'sessions.deviceId': 1 });
UserSchema.index({ role: 1 });

// Instance methods
UserSchema.methods.addSession = function(deviceId: string, platform: 'web' | 'ios' | 'android', refreshToken: string, pushToken?: string) {
  // Remove existing session for this device
  this.sessions = this.sessions.filter((s: any) => s.deviceId !== deviceId);

  // Add new session
  this.sessions.push({
    deviceId,
    platform,
    lastActive: new Date(),
    token: refreshToken,
    pushToken,
  });

  return this.save();
};

UserSchema.methods.removeSession = function(deviceId: string) {
  this.sessions = this.sessions.filter((s: any) => s.deviceId !== deviceId);
  return this.save();
};

UserSchema.methods.removeAllSessions = function() {
  this.sessions = [];
  return this.save();
};

UserSchema.methods.updateSessionActivity = function(deviceId: string) {
  const session = this.sessions.find((s: any) => s.deviceId === deviceId);
  if (session) {
    session.lastActive = new Date();
    return this.save();
  }
};

export const User = mongoose.model<IUserDocument>('User', UserSchema);
