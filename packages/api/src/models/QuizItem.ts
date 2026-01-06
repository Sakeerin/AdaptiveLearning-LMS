import mongoose, { Schema, Document, Model } from 'mongoose';
import { QuizItem as IQuizItem, QuizItemType, QuizItemOption } from '@adaptive-lms/shared';

export interface IQuizItemDocument extends Omit<IQuizItem, '_id' | 'createdAt' | 'updatedAt'>, Document {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface IQuizItemModel extends Model<IQuizItemDocument> {
  findByCompetency(competencyId: string): Promise<IQuizItemDocument[]>;
}

const QuizItemOptionSchema = new Schema({
  id: { type: String, required: true },
  text: {
    th: { type: String, required: true },
    en: { type: String },
  },
  correct: { type: Boolean, required: true },
}, { _id: false });

const QuizItemMetadataSchema = new Schema({
  difficulty: { type: Number, required: true, min: 1, max: 5 },
  tags: [{ type: String }],
}, { _id: false });

const QuizItemSchema = new Schema<IQuizItemDocument, IQuizItemModel>({
  type: {
    type: String,
    enum: ['mcq', 'multi-select', 'short-answer'],
    required: true,
  },
  question: {
    th: { type: String, required: true },
    en: { type: String },
  },
  options: [QuizItemOptionSchema], // For MCQ/multi-select
  correctAnswer: { type: String }, // For short-answer
  explanation: {
    th: { type: String, required: true },
    en: { type: String },
  },
  competencyId: { type: Schema.Types.ObjectId, ref: 'Competency', required: true },
  metadata: { type: QuizItemMetadataSchema, required: true },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
QuizItemSchema.index({ competencyId: 1 });
QuizItemSchema.index({ type: 1 });
QuizItemSchema.index({ 'metadata.difficulty': 1 });
QuizItemSchema.index({ competencyId: 1, 'metadata.difficulty': 1 });

// Validation
QuizItemSchema.pre('save', function(next) {
  // Validate MCQ/multi-select has options
  if ((this.type === 'mcq' || this.type === 'multi-select') && (!this.options || this.options.length === 0)) {
    next(new Error('MCQ and multi-select questions must have options'));
    return;
  }

  // Validate MCQ has exactly one correct answer
  if (this.type === 'mcq' && this.options) {
    const correctCount = this.options.filter(opt => opt.correct).length;
    if (correctCount !== 1) {
      next(new Error('MCQ must have exactly one correct answer'));
      return;
    }
  }

  // Validate multi-select has at least one correct answer
  if (this.type === 'multi-select' && this.options) {
    const correctCount = this.options.filter(opt => opt.correct).length;
    if (correctCount === 0) {
      next(new Error('Multi-select must have at least one correct answer'));
      return;
    }
  }

  // Validate short-answer has correctAnswer
  if (this.type === 'short-answer' && !this.correctAnswer) {
    next(new Error('Short-answer questions must have correctAnswer'));
    return;
  }

  next();
});

// Static methods
QuizItemSchema.statics.findByCompetency = async function(competencyId: string) {
  return this.find({ competencyId })
    .populate('competencyId')
    .exec();
};

export const QuizItem = mongoose.model<IQuizItemDocument, IQuizItemModel>('QuizItem', QuizItemSchema);
