import { Schema, model, Document, Types } from 'mongoose';

export interface ISyncQueueItem extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  deviceId: string;
  operation: 'create' | 'update' | 'delete';
  resourceType: 'lesson_progress' | 'quiz_attempt' | 'xapi_statement' | 'conversation' | 'mastery';
  resourceId?: string;
  data: any;
  clientTimestamp: Date;
  serverTimestamp: Date;
  syncStatus: 'pending' | 'synced' | 'failed' | 'conflict';
  conflictData?: any;
  errorMessage?: string;
  retryCount: number;
  lastRetryAt?: Date;
  metadata: {
    appVersion?: string;
    platform?: string;
    networkType?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SyncQueueItemSchema = new Schema<ISyncQueueItem>(
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
    operation: {
      type: String,
      enum: ['create', 'update', 'delete'],
      required: true
    },
    resourceType: {
      type: String,
      enum: ['lesson_progress', 'quiz_attempt', 'xapi_statement', 'conversation', 'mastery'],
      required: true,
      index: true
    },
    resourceId: {
      type: String
    },
    data: {
      type: Schema.Types.Mixed,
      required: true
    },
    clientTimestamp: {
      type: Date,
      required: true
    },
    serverTimestamp: {
      type: Date,
      default: Date.now
    },
    syncStatus: {
      type: String,
      enum: ['pending', 'synced', 'failed', 'conflict'],
      default: 'pending',
      index: true
    },
    conflictData: {
      type: Schema.Types.Mixed
    },
    errorMessage: {
      type: String
    },
    retryCount: {
      type: Number,
      default: 0,
      min: 0
    },
    lastRetryAt: {
      type: Date
    },
    metadata: {
      appVersion: String,
      platform: String,
      networkType: String
    }
  },
  {
    timestamps: true,
    collection: 'sync_queue'
  }
);

// Compound indexes for efficient queries
SyncQueueItemSchema.index({ userId: 1, syncStatus: 1, createdAt: -1 });
SyncQueueItemSchema.index({ userId: 1, deviceId: 1, syncStatus: 1 });
SyncQueueItemSchema.index({ syncStatus: 1, retryCount: 1, lastRetryAt: 1 });
SyncQueueItemSchema.index({ createdAt: 1 }); // For TTL or cleanup

// Static method to get pending items for user
SyncQueueItemSchema.statics.getPendingForUser = async function(
  userId: string,
  deviceId?: string,
  limit: number = 100
) {
  const query: any = {
    userId: new Types.ObjectId(userId),
    syncStatus: 'pending'
  };

  if (deviceId) {
    query.deviceId = deviceId;
  }

  return this.find(query)
    .sort({ clientTimestamp: 1 })
    .limit(limit)
    .lean();
};

// Static method to get conflicts for user
SyncQueueItemSchema.statics.getConflictsForUser = async function(
  userId: string,
  limit: number = 50
) {
  return this.find({
    userId: new Types.ObjectId(userId),
    syncStatus: 'conflict'
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

// Static method to mark as synced
SyncQueueItemSchema.statics.markAsSynced = async function(itemId: string) {
  return this.findByIdAndUpdate(
    itemId,
    {
      syncStatus: 'synced',
      serverTimestamp: new Date()
    },
    { new: true }
  );
};

// Static method to mark as failed
SyncQueueItemSchema.statics.markAsFailed = async function(
  itemId: string,
  errorMessage: string
) {
  return this.findByIdAndUpdate(
    itemId,
    {
      syncStatus: 'failed',
      errorMessage,
      $inc: { retryCount: 1 },
      lastRetryAt: new Date()
    },
    { new: true }
  );
};

// Static method to mark as conflict
SyncQueueItemSchema.statics.markAsConflict = async function(
  itemId: string,
  conflictData: any
) {
  return this.findByIdAndUpdate(
    itemId,
    {
      syncStatus: 'conflict',
      conflictData
    },
    { new: true }
  );
};

const SyncQueueItem = model<ISyncQueueItem>('SyncQueueItem', SyncQueueItemSchema);

export default SyncQueueItem;
