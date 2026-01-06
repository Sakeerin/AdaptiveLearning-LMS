import mongoose, { Schema, Document, Model } from 'mongoose';
import { Lesson as ILesson, LessonType, LessonContent, LessonMetadata } from '@adaptive-lms/shared';

export interface ILessonDocument extends Omit<ILesson, '_id' | 'createdAt' | 'updatedAt'>, Document {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface ILessonModel extends Model<ILessonDocument> {
  findByModule(moduleId: string): Promise<ILessonDocument[]>;
  findPublishedByModule(moduleId: string): Promise<ILessonDocument[]>;
  validatePrerequisites(lessonId: string): Promise<boolean>;
}

const LessonContentSchema = new Schema({
  body: { type: String },
  videoUrl: { type: String },
  attachments: [{ type: String }],
}, { _id: false });

const AccessibilitySchema = new Schema({
  captions: { type: String },
  transcripts: { type: String },
}, { _id: false });

const LessonMetadataSchema = new Schema({
  difficulty: { type: Number, required: true, min: 1, max: 5 },
  estimatedMinutes: { type: Number, required: true },
  prerequisites: [{ type: Schema.Types.ObjectId, ref: 'Lesson' }],
  tags: [{ type: String }],
  learningObjectives: [{ type: String }],
  accessibility: { type: AccessibilitySchema, required: true },
}, { _id: false });

const LessonSchema = new Schema<ILessonDocument, ILessonModel>({
  moduleId: { type: Schema.Types.ObjectId, ref: 'Module', required: true },
  type: {
    type: String,
    enum: ['video', 'reading', 'quiz', 'practice', 'assignment'],
    required: true,
  },
  content: {
    th: { type: LessonContentSchema },
    en: { type: LessonContentSchema },
  },
  metadata: { type: LessonMetadataSchema, required: true },
  competencies: {
    type: [{ type: Schema.Types.ObjectId, ref: 'Competency' }],
    required: true,
    validate: {
      validator: (v: any[]) => Array.isArray(v) && v.length >= 1,
      message: 'At least one competency is required per lesson',
    },
  },
  published: { type: Boolean, default: false },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
LessonSchema.index({ moduleId: 1 });
LessonSchema.index({ published: 1 });
LessonSchema.index({ moduleId: 1, published: 1 });
LessonSchema.index({ 'metadata.prerequisites': 1 });
LessonSchema.index({ competencies: 1 });

// Static methods
LessonSchema.statics.findByModule = async function(moduleId: string) {
  return this.find({ moduleId })
    .populate('competencies')
    .populate('metadata.prerequisites')
    .exec();
};

LessonSchema.statics.findPublishedByModule = async function(moduleId: string) {
  return this.find({ moduleId, published: true })
    .populate('competencies')
    .populate('metadata.prerequisites')
    .exec();
};

LessonSchema.statics.validatePrerequisites = async function(lessonId: string): Promise<boolean> {
  const lesson = await this.findById(lessonId).populate('metadata.prerequisites');

  if (!lesson || !lesson.metadata.prerequisites || lesson.metadata.prerequisites.length === 0) {
    return true; // No prerequisites, valid
  }

  // Check for circular dependencies using DFS
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  const hasCycle = async (currentId: string): Promise<boolean> => {
    if (recursionStack.has(currentId)) {
      return true; // Cycle detected
    }

    if (visited.has(currentId)) {
      return false; // Already checked this path
    }

    visited.add(currentId);
    recursionStack.add(currentId);

    const currentLesson = await this.findById(currentId);
    if (currentLesson?.metadata.prerequisites) {
      for (const prereqId of currentLesson.metadata.prerequisites) {
        if (await hasCycle(prereqId.toString())) {
          return true;
        }
      }
    }

    recursionStack.delete(currentId);
    return false;
  };

  const cycleExists = await hasCycle(lessonId);
  return !cycleExists; // Valid if no cycle
};

export const Lesson = mongoose.model<ILessonDocument, ILessonModel>('Lesson', LessonSchema);
