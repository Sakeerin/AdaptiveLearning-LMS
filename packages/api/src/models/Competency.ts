import mongoose, { Schema, Document, Model } from 'mongoose';
import { Competency as ICompetency, CompetencyMetadata } from '@adaptive-lms/shared';

export interface ICompetencyDocument extends Omit<ICompetency, '_id' | 'createdAt' | 'updatedAt'>, Document {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface ICompetencyModel extends Model<ICompetencyDocument> {
  findByCourse(courseId: string): Promise<ICompetencyDocument[]>;
  findByCode(code: string): Promise<ICompetencyDocument | null>;
  validateDAG(competencyId: string): Promise<boolean>;
  getPrerequisitesTree(competencyId: string): Promise<string[]>;
}

const CompetencyMetadataSchema = new Schema({
  domain: { type: String, required: true },
  difficulty: { type: Number, required: true, min: 1, max: 5 },
}, { _id: false });

const CompetencySchema = new Schema<ICompetencyDocument, ICompetencyModel>({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  name: {
    th: { type: String, required: true },
    en: { type: String },
  },
  description: {
    th: { type: String, required: true },
    en: { type: String },
  },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  prerequisites: [{ type: Schema.Types.ObjectId, ref: 'Competency' }],
  metadata: { type: CompetencyMetadataSchema, required: true },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
CompetencySchema.index({ code: 1 }, { unique: true });
CompetencySchema.index({ courseId: 1 });
CompetencySchema.index({ 'metadata.domain': 1 });
CompetencySchema.index({ prerequisites: 1 });

// Static methods
CompetencySchema.statics.findByCourse = async function(courseId: string) {
  return this.find({ courseId })
    .populate('prerequisites')
    .exec();
};

CompetencySchema.statics.findByCode = async function(code: string) {
  return this.findOne({ code: code.toUpperCase() })
    .populate('prerequisites')
    .exec();
};

/**
 * Validate that competencies form a DAG (no cycles)
 * Uses DFS to detect cycles
 */
CompetencySchema.statics.validateDAG = async function(competencyId: string): Promise<boolean> {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  const hasCycle = async (currentId: string): Promise<boolean> => {
    if (recursionStack.has(currentId)) {
      return true; // Cycle detected
    }

    if (visited.has(currentId)) {
      return false; // Already checked
    }

    visited.add(currentId);
    recursionStack.add(currentId);

    const competency = await this.findById(currentId);
    if (competency?.prerequisites) {
      for (const prereqId of competency.prerequisites) {
        if (await hasCycle(prereqId.toString())) {
          return true;
        }
      }
    }

    recursionStack.delete(currentId);
    return false;
  };

  const cycleExists = await hasCycle(competencyId);
  return !cycleExists; // Valid if no cycle
};

/**
 * Get all prerequisite competencies (transitive closure)
 * Returns flat list of all prerequisite IDs
 */
CompetencySchema.statics.getPrerequisitesTree = async function(competencyId: string): Promise<string[]> {
  const allPrerequisites = new Set<string>();

  const traverse = async (currentId: string) => {
    const competency = await this.findById(currentId);
    if (!competency?.prerequisites) return;

    for (const prereqId of competency.prerequisites) {
      const prereqIdStr = prereqId.toString();
      if (!allPrerequisites.has(prereqIdStr)) {
        allPrerequisites.add(prereqIdStr);
        await traverse(prereqIdStr);
      }
    }
  };

  await traverse(competencyId);
  return Array.from(allPrerequisites);
};

export const Competency = mongoose.model<ICompetencyDocument, ICompetencyModel>('Competency', CompetencySchema);
