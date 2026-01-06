import mongoose, { Schema, Document, Model } from 'mongoose';
import { Module as IModule } from '@adaptive-lms/shared';

export interface IModuleDocument extends Omit<IModule, '_id' | 'createdAt' | 'updatedAt'>, Document {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface IModuleModel extends Model<IModuleDocument> {
  findByCourse(courseId: string): Promise<IModuleDocument[]>;
}

const ModuleSchema = new Schema<IModuleDocument, IModuleModel>({
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  title: {
    th: { type: String, required: true },
    en: { type: String },
  },
  description: {
    th: { type: String, required: true },
    en: { type: String },
  },
  lessons: [{ type: Schema.Types.ObjectId, ref: 'Lesson' }],
  order: { type: Number, required: true, default: 0 },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
ModuleSchema.index({ courseId: 1, order: 1 });
ModuleSchema.index({ courseId: 1 });

// Static methods
ModuleSchema.statics.findByCourse = async function(courseId: string) {
  return this.find({ courseId })
    .populate('lessons')
    .sort({ order: 1 })
    .exec();
};

export const Module = mongoose.model<IModuleDocument, IModuleModel>('Module', ModuleSchema);
