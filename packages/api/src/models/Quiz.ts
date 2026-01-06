import mongoose, { Schema, Document, Model } from 'mongoose';
import { Quiz as IQuiz, QuizConfig } from '@adaptive-lms/shared';

export interface IQuizDocument extends Omit<IQuiz, '_id' | 'createdAt' | 'updatedAt'>, Document {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface IQuizModel extends Model<IQuizDocument> {
  findByLesson(lessonId: string): Promise<IQuizDocument[]>;
}

const QuizConfigSchema = new Schema({
  itemCount: { type: Number, required: true, min: 1 },
  timeLimit: { type: Number }, // minutes
  attempts: { type: Number, default: 3 },
  randomize: { type: Boolean, default: true },
  partialCredit: { type: Boolean, default: false },
}, { _id: false });

const QuizSchema = new Schema<IQuizDocument, IQuizModel>({
  lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
  title: {
    th: { type: String, required: true },
    en: { type: String },
  },
  config: { type: QuizConfigSchema, required: true },
  items: [{ type: Schema.Types.ObjectId, ref: 'QuizItem' }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
QuizSchema.index({ lessonId: 1 });

// Validation
QuizSchema.pre('save', function(next) {
  if (this.items.length < this.config.itemCount) {
    next(new Error(`Quiz must have at least ${this.config.itemCount} items`));
    return;
  }
  next();
});

// Static methods
QuizSchema.statics.findByLesson = async function(lessonId: string) {
  return this.find({ lessonId })
    .populate('items')
    .exec();
};

export const Quiz = mongoose.model<IQuizDocument, IQuizModel>('Quiz', QuizSchema);
