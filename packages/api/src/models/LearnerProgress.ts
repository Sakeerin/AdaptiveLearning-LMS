import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILearnerProgressDocument extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  lessonId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  status: 'not-started' | 'in-progress' | 'completed';
  completionPercentage: number; // 0-100
  timeSpent: number; // milliseconds
  lastAccessedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface ILearnerProgressModel extends Model<ILearnerProgressDocument> {
  findByUser(userId: string): Promise<ILearnerProgressDocument[]>;
  findByUserAndCourse(userId: string, courseId: string): Promise<ILearnerProgressDocument[]>;
  findByUserAndLesson(userId: string, lessonId: string): Promise<ILearnerProgressDocument | null>;
  updateProgress(
    userId: string,
    lessonId: string,
    courseId: string,
    percentage: number,
    timeSpent: number
  ): Promise<ILearnerProgressDocument>;
  markCompleted(userId: string, lessonId: string): Promise<ILearnerProgressDocument>;
}

const LearnerProgressSchema = new Schema<ILearnerProgressDocument, ILearnerProgressModel>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  status: {
    type: String,
    enum: ['not-started', 'in-progress', 'completed'],
    default: 'not-started',
  },
  completionPercentage: { type: Number, default: 0, min: 0, max: 100 },
  timeSpent: { type: Number, default: 0 }, // milliseconds
  lastAccessedAt: { type: Date, required: true, default: Date.now },
  startedAt: { type: Date },
  completedAt: { type: Date },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
LearnerProgressSchema.index({ userId: 1, lessonId: 1 }, { unique: true });
LearnerProgressSchema.index({ userId: 1, courseId: 1 });
LearnerProgressSchema.index({ userId: 1 });
LearnerProgressSchema.index({ userId: 1, status: 1 });
LearnerProgressSchema.index({ lastAccessedAt: -1 });

// Static methods
LearnerProgressSchema.statics.findByUser = async function(userId: string) {
  return this.find({ userId })
    .populate('lessonId')
    .populate('courseId')
    .sort({ lastAccessedAt: -1 })
    .exec();
};

LearnerProgressSchema.statics.findByUserAndCourse = async function(userId: string, courseId: string) {
  return this.find({ userId, courseId })
    .populate('lessonId')
    .sort({ lastAccessedAt: -1 })
    .exec();
};

LearnerProgressSchema.statics.findByUserAndLesson = async function(userId: string, lessonId: string) {
  return this.findOne({ userId, lessonId })
    .populate('lessonId')
    .populate('courseId')
    .exec();
};

LearnerProgressSchema.statics.updateProgress = async function(
  userId: string,
  lessonId: string,
  courseId: string,
  percentage: number,
  timeSpent: number
): Promise<ILearnerProgressDocument> {
  let progress = await this.findOne({ userId, lessonId });

  if (!progress) {
    progress = new this({
      userId,
      lessonId,
      courseId,
      completionPercentage: percentage,
      timeSpent,
      status: 'in-progress',
      lastAccessedAt: new Date(),
      startedAt: new Date(),
    });
  } else {
    progress.completionPercentage = Math.max(progress.completionPercentage, percentage);
    progress.timeSpent += timeSpent;
    progress.lastAccessedAt = new Date();

    if (progress.status === 'not-started') {
      progress.status = 'in-progress';
      progress.startedAt = new Date();
    }

    // Auto-complete if 100%
    if (percentage >= 100 && progress.status !== 'completed') {
      progress.status = 'completed';
      progress.completedAt = new Date();
    }
  }

  await progress.save();
  return progress;
};

LearnerProgressSchema.statics.markCompleted = async function(
  userId: string,
  lessonId: string
): Promise<ILearnerProgressDocument> {
  const progress = await this.findOne({ userId, lessonId });

  if (!progress) {
    throw new Error('Progress record not found');
  }

  if (progress.status !== 'completed') {
    progress.status = 'completed';
    progress.completionPercentage = 100;
    progress.completedAt = new Date();
    await progress.save();
  }

  return progress;
};

export const LearnerProgress = mongoose.model<ILearnerProgressDocument, ILearnerProgressModel>(
  'LearnerProgress',
  LearnerProgressSchema
);
