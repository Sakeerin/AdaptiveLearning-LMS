import { Schema, model, Document, Types } from 'mongoose';

export interface INotification extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: 'achievement' | 'reminder' | 'announcement' | 'streak' | 'quiz_result' | 'course_update' | 'level_up';
  title: { th: string; en: string };
  message: { th: string; en: string };
  data?: any;
  channels: ('in_app' | 'email' | 'push')[];
  status: {
    in_app?: 'pending' | 'delivered' | 'read';
    email?: 'pending' | 'sent' | 'failed';
    push?: 'pending' | 'sent' | 'failed';
  };
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduledFor?: Date;
  sentAt?: Date;
  readAt?: Date;
  expiresAt?: Date;
  metadata: {
    actionUrl?: string;
    imageUrl?: string;
    category?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['achievement', 'reminder', 'announcement', 'streak', 'quiz_result', 'course_update', 'level_up'],
      required: true,
      index: true
    },
    title: {
      th: { type: String, required: true },
      en: { type: String, required: true }
    },
    message: {
      th: { type: String, required: true },
      en: { type: String, required: true }
    },
    data: {
      type: Schema.Types.Mixed
    },
    channels: {
      type: [String],
      enum: ['in_app', 'email', 'push'],
      required: true,
      default: ['in_app']
    },
    status: {
      in_app: {
        type: String,
        enum: ['pending', 'delivered', 'read']
      },
      email: {
        type: String,
        enum: ['pending', 'sent', 'failed']
      },
      push: {
        type: String,
        enum: ['pending', 'sent', 'failed']
      }
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    scheduledFor: {
      type: Date
    },
    sentAt: {
      type: Date
    },
    readAt: {
      type: Date,
      index: true
    },
    expiresAt: {
      type: Date,
      index: true
    },
    metadata: {
      actionUrl: String,
      imageUrl: String,
      category: String
    }
  },
  {
    timestamps: true,
    collection: 'notifications'
  }
);

// Compound indexes for efficient queries
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, type: 1, createdAt: -1 });
NotificationSchema.index({ scheduledFor: 1, 'status.in_app': 1 }); // For scheduled delivery
NotificationSchema.index({ expiresAt: 1 }); // For cleanup

// Static method to get unread notifications
NotificationSchema.statics.getUnread = async function(
  userId: string,
  limit: number = 50
) {
  return this.find({
    userId: new Types.ObjectId(userId),
    readAt: { $exists: false },
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

// Static method to mark as read
NotificationSchema.statics.markAsRead = async function(
  userId: string,
  notificationId: string
) {
  return this.findOneAndUpdate(
    {
      _id: new Types.ObjectId(notificationId),
      userId: new Types.ObjectId(userId)
    },
    {
      readAt: new Date(),
      'status.in_app': 'read'
    },
    { new: true }
  );
};

// Static method to mark all as read
NotificationSchema.statics.markAllAsRead = async function(userId: string) {
  return this.updateMany(
    {
      userId: new Types.ObjectId(userId),
      readAt: { $exists: false }
    },
    {
      readAt: new Date(),
      'status.in_app': 'read'
    }
  );
};

// Static method to get unread count
NotificationSchema.statics.getUnreadCount = async function(userId: string) {
  return this.countDocuments({
    userId: new Types.ObjectId(userId),
    readAt: { $exists: false },
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  });
};

const Notification = model<INotification>('Notification', NotificationSchema);

export default Notification;
