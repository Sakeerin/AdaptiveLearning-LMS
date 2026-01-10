import { Schema, model, Document, Types } from 'mongoose';

export interface INotificationPreferences extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  channels: {
    in_app: {
      enabled: boolean;
    };
    email: {
      enabled: boolean;
      address?: string;
      verified: boolean;
    };
    push: {
      enabled: boolean;
      tokens: Array<{
        token: string;
        platform: 'ios' | 'android' | 'web';
        deviceId: string;
        createdAt: Date;
      }>;
    };
  };
  types: {
    achievement: { in_app: boolean; email: boolean; push: boolean };
    reminder: { in_app: boolean; email: boolean; push: boolean };
    announcement: { in_app: boolean; email: boolean; push: boolean };
    streak: { in_app: boolean; email: boolean; push: boolean };
    quiz_result: { in_app: boolean; email: boolean; push: boolean };
    course_update: { in_app: boolean; email: boolean; push: boolean };
    level_up: { in_app: boolean; email: boolean; push: boolean };
  };
  schedule: {
    quietHours: {
      enabled: boolean;
      start: string; // HH:mm format
      end: string;   // HH:mm format
      timezone: string;
    };
    digestFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  };
  createdAt: Date;
  updatedAt: Date;
}

const NotificationPreferencesSchema = new Schema<INotificationPreferences>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    channels: {
      in_app: {
        enabled: { type: Boolean, default: true }
      },
      email: {
        enabled: { type: Boolean, default: true },
        address: String,
        verified: { type: Boolean, default: false }
      },
      push: {
        enabled: { type: Boolean, default: true },
        tokens: [{
          token: { type: String, required: true },
          platform: {
            type: String,
            enum: ['ios', 'android', 'web'],
            required: true
          },
          deviceId: { type: String, required: true },
          createdAt: { type: Date, default: Date.now }
        }]
      }
    },
    types: {
      achievement: {
        in_app: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true }
      },
      reminder: {
        in_app: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true }
      },
      announcement: {
        in_app: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: false }
      },
      streak: {
        in_app: { type: Boolean, default: true },
        email: { type: Boolean, default: false },
        push: { type: Boolean, default: true }
      },
      quiz_result: {
        in_app: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true }
      },
      course_update: {
        in_app: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: false }
      },
      level_up: {
        in_app: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true }
      }
    },
    schedule: {
      quietHours: {
        enabled: { type: Boolean, default: false },
        start: { type: String, default: '22:00' },
        end: { type: String, default: '08:00' },
        timezone: { type: String, default: 'Asia/Bangkok' }
      },
      digestFrequency: {
        type: String,
        enum: ['realtime', 'hourly', 'daily', 'weekly'],
        default: 'realtime'
      }
    }
  },
  {
    timestamps: true,
    collection: 'notification_preferences'
  }
);

// Static method to get or create preferences
NotificationPreferencesSchema.statics.getOrCreate = async function(userId: string) {
  let prefs = await this.findOne({ userId: new Types.ObjectId(userId) });

  if (!prefs) {
    prefs = new this({ userId: new Types.ObjectId(userId) });
    await prefs.save();
  }

  return prefs;
};

// Static method to add push token
NotificationPreferencesSchema.statics.addPushToken = async function(
  userId: string,
  token: string,
  platform: 'ios' | 'android' | 'web',
  deviceId: string
) {
  const prefs = await this.getOrCreate(userId);

  // Remove existing token for this device
  prefs.channels.push.tokens = prefs.channels.push.tokens.filter(
    (t: any) => t.deviceId !== deviceId
  );

  // Add new token
  prefs.channels.push.tokens.push({
    token,
    platform,
    deviceId,
    createdAt: new Date()
  });

  await prefs.save();
  return prefs;
};

// Static method to remove push token
NotificationPreferencesSchema.statics.removePushToken = async function(
  userId: string,
  deviceId: string
) {
  const prefs = await this.findOne({ userId: new Types.ObjectId(userId) });

  if (prefs) {
    prefs.channels.push.tokens = prefs.channels.push.tokens.filter(
      (t: any) => t.deviceId !== deviceId
    );
    await prefs.save();
  }

  return prefs;
};

const NotificationPreferences = model<INotificationPreferences>(
  'NotificationPreferences',
  NotificationPreferencesSchema
);

export default NotificationPreferences;
