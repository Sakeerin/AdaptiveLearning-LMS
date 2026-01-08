import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  citations?: Array<{
    source: string;
    lessonId?: string;
    competencyId?: string;
    excerpt?: string;
  }>;
}

export interface IConversationDocument extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  lessonId?: mongoose.Types.ObjectId;
  courseId?: mongoose.Types.ObjectId;
  title: string;
  messages: IMessage[];
  context: {
    currentLesson?: string;
    competencies?: string[];
    language: 'th' | 'en';
  };
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface IConversationModel extends Model<IConversationDocument> {
  findByUser(userId: string, limit?: number): Promise<IConversationDocument[]>;
  findByUserAndLesson(userId: string, lessonId: string): Promise<IConversationDocument[]>;
  createConversation(
    userId: string,
    lessonId: string | undefined,
    courseId: string | undefined,
    language: 'th' | 'en'
  ): Promise<IConversationDocument>;
}

const MessageSchema = new Schema({
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, required: true, default: Date.now },
  citations: [{
    source: { type: String, required: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson' },
    competencyId: { type: Schema.Types.ObjectId, ref: 'Competency' },
    excerpt: { type: String },
  }],
}, { _id: false });

const ConversationSchema = new Schema<IConversationDocument, IConversationModel>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson' },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course' },
  title: { type: String, required: true },
  messages: [MessageSchema],
  context: {
    currentLesson: { type: String },
    competencies: [{ type: String }],
    language: { type: String, enum: ['th', 'en'], default: 'en' },
  },
  lastMessageAt: { type: Date, required: true, default: Date.now },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
ConversationSchema.index({ userId: 1, lastMessageAt: -1 });
ConversationSchema.index({ userId: 1, lessonId: 1 });
ConversationSchema.index({ userId: 1 });
ConversationSchema.index({ lastMessageAt: -1 });

// Static methods
ConversationSchema.statics.findByUser = async function(userId: string, limit: number = 20) {
  return this.find({ userId })
    .sort({ lastMessageAt: -1 })
    .limit(limit)
    .exec();
};

ConversationSchema.statics.findByUserAndLesson = async function(userId: string, lessonId: string) {
  return this.find({ userId, lessonId })
    .sort({ lastMessageAt: -1 })
    .exec();
};

ConversationSchema.statics.createConversation = async function(
  userId: string,
  lessonId: string | undefined,
  courseId: string | undefined,
  language: 'th' | 'en'
): Promise<IConversationDocument> {
  const title = `Conversation ${new Date().toLocaleDateString()}`;

  const conversation = new this({
    userId,
    lessonId,
    courseId,
    title,
    messages: [],
    context: {
      currentLesson: lessonId,
      competencies: [],
      language,
    },
    lastMessageAt: new Date(),
  });

  await conversation.save();
  return conversation;
};

export const Conversation = mongoose.model<IConversationDocument, IConversationModel>(
  'Conversation',
  ConversationSchema
);
