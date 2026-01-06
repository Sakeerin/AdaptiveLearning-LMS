import mongoose, { Schema, Document, Model } from 'mongoose';
import { Course as ICourse, CourseMetadata } from '@adaptive-lms/shared';

export interface ICourseDocument extends Omit<ICourse, '_id' | 'createdAt' | 'updatedAt'>, Document {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface ICourseModel extends Model<ICourseDocument> {
  findPublished(filters?: { tags?: string[] }): Promise<ICourseDocument[]>;
  findBySlug(slug: string): Promise<ICourseDocument | null>;
}

const CourseMetadataSchema = new Schema({
  difficulty: { type: Number, required: true, min: 1, max: 5 },
  estimatedHours: { type: Number, required: true },
  tags: [{ type: String }],
}, { _id: false });

const CourseSchema = new Schema<ICourseDocument, ICourseModel>({
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  title: {
    th: { type: String, required: true },
    en: { type: String },
  },
  description: {
    th: { type: String, required: true },
    en: { type: String },
  },
  modules: [{ type: Schema.Types.ObjectId, ref: 'Module' }],
  competencies: [{ type: Schema.Types.ObjectId, ref: 'Competency' }],
  published: { type: Boolean, default: false },
  metadata: { type: CourseMetadataSchema, required: true },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
CourseSchema.index({ slug: 1 }, { unique: true });
CourseSchema.index({ published: 1 });
CourseSchema.index({ 'metadata.tags': 1 });
CourseSchema.index({ published: 1, 'metadata.difficulty': 1 });

// Static methods
CourseSchema.statics.findPublished = async function(filters?: { tags?: string[] }) {
  const query: any = { published: true };

  if (filters?.tags && filters.tags.length > 0) {
    query['metadata.tags'] = { $in: filters.tags };
  }

  return this.find(query)
    .populate('modules')
    .populate('competencies')
    .sort({ createdAt: -1 })
    .exec();
};

CourseSchema.statics.findBySlug = async function(slug: string) {
  return this.findOne({ slug })
    .populate('modules')
    .populate('competencies')
    .exec();
};

export const Course = mongoose.model<ICourseDocument, ICourseModel>('Course', CourseSchema);
