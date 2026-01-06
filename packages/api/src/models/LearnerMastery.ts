import mongoose, { Schema, Document, Model } from 'mongoose';
import { LearnerMastery as ILearnerMastery, MasteryHistoryEntry, MasteryStatus } from '@adaptive-lms/shared';

export interface ILearnerMasteryDocument extends Omit<ILearnerMastery, '_id' | 'createdAt' | 'updatedAt'>, Document {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface ILearnerMasteryModel extends Model<ILearnerMasteryDocument> {
  findByUser(userId: string): Promise<ILearnerMasteryDocument[]>;
  findByUserAndCompetency(userId: string, competencyId: string): Promise<ILearnerMasteryDocument | null>;
  updateMastery(
    userId: string,
    competencyId: string,
    mastery: number,
    confidence: number,
    eventType: 'quiz' | 'practice' | 'decay' | 'manual'
  ): Promise<ILearnerMasteryDocument>;
  applyDecay(userId: string, daysSinceLastAssessed: number): Promise<void>;
}

const MasteryHistoryEntrySchema = new Schema({
  timestamp: { type: Date, required: true, default: Date.now },
  mastery: { type: Number, required: true, min: 0, max: 1 },
  confidence: { type: Number, required: true, min: 0, max: 1 },
  eventType: {
    type: String,
    enum: ['quiz', 'practice', 'decay', 'manual'],
    required: true,
  },
}, { _id: false });

const LearnerMasterySchema = new Schema<ILearnerMasteryDocument, ILearnerMasteryModel>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  competencyId: { type: Schema.Types.ObjectId, ref: 'Competency', required: true },
  mastery: { type: Number, required: true, min: 0, max: 1, default: 0 },
  confidence: { type: Number, required: true, min: 0, max: 1, default: 0 },
  lastAssessed: { type: Date, required: true, default: Date.now },
  decayRate: { type: Number, default: 0.05 }, // 5% decay per week
  history: [MasteryHistoryEntrySchema],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
LearnerMasterySchema.index({ userId: 1, competencyId: 1 }, { unique: true });
LearnerMasterySchema.index({ userId: 1 });
LearnerMasterySchema.index({ competencyId: 1 });
LearnerMasterySchema.index({ userId: 1, mastery: -1 });
LearnerMasterySchema.index({ lastAssessed: 1 }); // For decay queries

// Virtual for mastery status
LearnerMasterySchema.virtual('status').get(function() {
  if (this.mastery >= 0.8) return 'mastered';
  if (this.mastery >= 0.5) return 'developing';
  return 'remediation';
});

// Static methods
LearnerMasterySchema.statics.findByUser = async function(userId: string) {
  return this.find({ userId })
    .populate('competencyId')
    .sort({ mastery: -1 })
    .exec();
};

LearnerMasterySchema.statics.findByUserAndCompetency = async function(
  userId: string,
  competencyId: string
) {
  return this.findOne({ userId, competencyId })
    .populate('competencyId')
    .exec();
};

LearnerMasterySchema.statics.updateMastery = async function(
  userId: string,
  competencyId: string,
  mastery: number,
  confidence: number,
  eventType: 'quiz' | 'practice' | 'decay' | 'manual'
): Promise<ILearnerMasteryDocument> {
  // Find or create mastery record
  let masteryRecord = await this.findOne({ userId, competencyId });

  if (!masteryRecord) {
    masteryRecord = new this({
      userId,
      competencyId,
      mastery,
      confidence,
      lastAssessed: new Date(),
      history: [],
    });
  } else {
    masteryRecord.mastery = mastery;
    masteryRecord.confidence = confidence;
    masteryRecord.lastAssessed = new Date();
  }

  // Add to history
  masteryRecord.history.push({
    timestamp: new Date(),
    mastery,
    confidence,
    eventType,
  });

  // Keep only last 50 history entries
  if (masteryRecord.history.length > 50) {
    masteryRecord.history = masteryRecord.history.slice(-50);
  }

  await masteryRecord.save();
  return masteryRecord;
};

LearnerMasterySchema.statics.applyDecay = async function(
  userId: string,
  daysSinceLastAssessed: number = 7
): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastAssessed);

  // Find all mastery records that haven't been assessed recently
  const staleRecords = await this.find({
    userId,
    lastAssessed: { $lt: cutoffDate },
    mastery: { $gt: 0 }, // Only decay if mastery > 0
  });

  for (const record of staleRecords) {
    const daysSinceAssessed = Math.floor(
      (Date.now() - record.lastAssessed.getTime()) / (1000 * 60 * 60 * 24)
    );
    const weeksSinceAssessed = daysSinceAssessed / 7;

    // Apply exponential decay: mastery * (1 - decayRate) ^ weeks
    const decayFactor = Math.pow(1 - record.decayRate, weeksSinceAssessed);
    const newMastery = Math.max(0, record.mastery * decayFactor);

    // Only update if mastery changed significantly (> 0.01)
    if (Math.abs(record.mastery - newMastery) > 0.01) {
      record.mastery = newMastery;
      record.confidence = Math.max(0, record.confidence * decayFactor); // Confidence also decays
      record.lastAssessed = new Date();

      record.history.push({
        timestamp: new Date(),
        mastery: newMastery,
        confidence: record.confidence,
        eventType: 'decay',
      });

      // Keep only last 50 history entries
      if (record.history.length > 50) {
        record.history = record.history.slice(-50);
      }

      await record.save();
    }
  }
};

export const LearnerMastery = mongoose.model<ILearnerMasteryDocument, ILearnerMasteryModel>(
  'LearnerMastery',
  LearnerMasterySchema
);
