import { Schema, model, Document, Types } from 'mongoose';

export interface IDeviceSyncState extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  deviceId: string;
  deviceName?: string;
  lastSyncAt: Date;
  lastSyncVersion: number;
  syncedResources: {
    lessons: Date;
    quizzes: Date;
    progress: Date;
    mastery: Date;
    achievements: Date;
  };
  pendingCount: number;
  failedCount: number;
  conflictCount: number;
  metadata: {
    appVersion?: string;
    platform?: string;
    osVersion?: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DeviceSyncStateSchema = new Schema<IDeviceSyncState>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    deviceId: {
      type: String,
      required: true,
      index: true
    },
    deviceName: {
      type: String
    },
    lastSyncAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    lastSyncVersion: {
      type: Number,
      default: 0,
      min: 0
    },
    syncedResources: {
      lessons: { type: Date },
      quizzes: { type: Date },
      progress: { type: Date },
      mastery: { type: Date },
      achievements: { type: Date }
    },
    pendingCount: {
      type: Number,
      default: 0,
      min: 0
    },
    failedCount: {
      type: Number,
      default: 0,
      min: 0
    },
    conflictCount: {
      type: Number,
      default: 0,
      min: 0
    },
    metadata: {
      appVersion: String,
      platform: String,
      osVersion: String
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    collection: 'device_sync_states'
  }
);

// Compound unique index
DeviceSyncStateSchema.index({ userId: 1, deviceId: 1 }, { unique: true });
DeviceSyncStateSchema.index({ userId: 1, isActive: 1 });
DeviceSyncStateSchema.index({ lastSyncAt: -1 });

// Static method to update sync state
DeviceSyncStateSchema.statics.updateSyncState = async function(
  userId: string,
  deviceId: string,
  updates: Partial<IDeviceSyncState>
) {
  return this.findOneAndUpdate(
    { userId: new Types.ObjectId(userId), deviceId },
    {
      $set: {
        ...updates,
        lastSyncAt: new Date()
      },
      $inc: { lastSyncVersion: 1 }
    },
    { upsert: true, new: true }
  );
};

// Static method to get active devices for user
DeviceSyncStateSchema.statics.getActiveDevices = async function(userId: string) {
  return this.find({
    userId: new Types.ObjectId(userId),
    isActive: true
  })
    .sort({ lastSyncAt: -1 })
    .lean();
};

const DeviceSyncState = model<IDeviceSyncState>('DeviceSyncState', DeviceSyncStateSchema);

export default DeviceSyncState;
