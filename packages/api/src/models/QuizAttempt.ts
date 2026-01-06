import mongoose, { Schema, Document, Model } from 'mongoose';
import { QuizAttempt as IQuizAttempt, QuizResponse, QuizScore } from '@adaptive-lms/shared';

export interface IQuizAttemptDocument extends Omit<IQuizAttempt, '_id' | 'createdAt' | 'updatedAt'>, Document {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface IQuizAttemptModel extends Model<IQuizAttemptDocument> {
  findByUser(userId: string): Promise<IQuizAttemptDocument[]>;
  findByQuiz(quizId: string): Promise<IQuizAttemptDocument[]>;
  findByUserAndQuiz(userId: string, quizId: string): Promise<IQuizAttemptDocument[]>;
  getAttemptCount(userId: string, quizId: string): Promise<number>;
  getBestScore(userId: string, quizId: string): Promise<QuizScore | null>;
}

const QuizResponseSchema = new Schema({
  itemId: { type: Schema.Types.ObjectId, ref: 'QuizItem', required: true },
  response: { type: Schema.Types.Mixed, required: true }, // string or string[]
  correct: { type: Boolean, required: true },
  points: { type: Number, required: true },
  hintsUsed: { type: Number, default: 0 },
  timeTaken: { type: Number }, // seconds
}, { _id: false });

const QuizScoreSchema = new Schema({
  earned: { type: Number, required: true },
  possible: { type: Number, required: true },
  percentage: { type: Number, required: true, min: 0, max: 100 },
}, { _id: false });

const QuizAttemptSchema = new Schema<IQuizAttemptDocument, IQuizAttemptModel>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
  attemptNumber: { type: Number, required: true },
  startedAt: { type: Date, required: true, default: Date.now },
  submittedAt: { type: Date },
  responses: [QuizResponseSchema],
  score: QuizScoreSchema,
  xapiStatementIds: [{ type: String }], // UUID[]
  syncStatus: {
    type: String,
    enum: ['pending', 'synced', 'failed'],
    default: 'pending',
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
QuizAttemptSchema.index({ userId: 1, quizId: 1 });
QuizAttemptSchema.index({ userId: 1 });
QuizAttemptSchema.index({ quizId: 1 });
QuizAttemptSchema.index({ userId: 1, quizId: 1, attemptNumber: 1 }, { unique: true });
QuizAttemptSchema.index({ submittedAt: 1 });
QuizAttemptSchema.index({ syncStatus: 1 });

// Virtual for completion status
QuizAttemptSchema.virtual('completed').get(function() {
  return !!this.submittedAt;
});

// Static methods
QuizAttemptSchema.statics.findByUser = async function(userId: string) {
  return this.find({ userId })
    .populate('quizId')
    .sort({ startedAt: -1 })
    .exec();
};

QuizAttemptSchema.statics.findByQuiz = async function(quizId: string) {
  return this.find({ quizId })
    .populate('userId')
    .sort({ startedAt: -1 })
    .exec();
};

QuizAttemptSchema.statics.findByUserAndQuiz = async function(userId: string, quizId: string) {
  return this.find({ userId, quizId })
    .sort({ attemptNumber: -1 })
    .exec();
};

QuizAttemptSchema.statics.getAttemptCount = async function(userId: string, quizId: string): Promise<number> {
  return this.countDocuments({ userId, quizId });
};

QuizAttemptSchema.statics.getBestScore = async function(
  userId: string,
  quizId: string
): Promise<QuizScore | null> {
  const attempts = await this.find({ userId, quizId, score: { $exists: true } })
    .sort({ 'score.percentage': -1 })
    .limit(1)
    .exec();

  if (attempts.length === 0) {
    return null;
  }

  return attempts[0].score;
};

export const QuizAttempt = mongoose.model<IQuizAttemptDocument, IQuizAttemptModel>(
  'QuizAttempt',
  QuizAttemptSchema
);
