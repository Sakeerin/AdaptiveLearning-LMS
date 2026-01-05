import { z } from 'zod';
import { BilingualTextSchema } from './user';

export const CompetencyMetadataSchema = z.object({
  domain: z.string(),
  difficulty: z.number().min(1).max(5),
});
export type CompetencyMetadata = z.infer<typeof CompetencyMetadataSchema>;

export const CompetencySchema = z.object({
  _id: z.string(),
  code: z.string(), // e.g., "ALG-LINEAR-EQ"
  name: BilingualTextSchema,
  description: BilingualTextSchema,
  courseId: z.string(),
  prerequisites: z.array(z.string()).default([]), // Competency IDs (DAG)
  metadata: CompetencyMetadataSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Competency = z.infer<typeof CompetencySchema>;

export const MasteryStatusSchema = z.enum(['mastered', 'developing', 'remediation']);
export type MasteryStatus = z.infer<typeof MasteryStatusSchema>;

export const MasteryHistoryEntrySchema = z.object({
  timestamp: z.date(),
  mastery: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  eventType: z.enum(['quiz', 'practice', 'decay', 'manual']),
});
export type MasteryHistoryEntry = z.infer<typeof MasteryHistoryEntrySchema>;

export const LearnerMasterySchema = z.object({
  _id: z.string(),
  userId: z.string(),
  competencyId: z.string(),
  mastery: z.number().min(0).max(1), // 0.0-1.0
  confidence: z.number().min(0).max(1), // 0.0-1.0
  lastAssessed: z.date(),
  decayRate: z.number().default(0.05), // 5% decay per week
  history: z.array(MasteryHistoryEntrySchema).default([]),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type LearnerMastery = z.infer<typeof LearnerMasterySchema>;

// Helper functions for mastery thresholds
export const MASTERY_THRESHOLDS = {
  mastered: 0.8,
  developing: 0.5,
  remediation: 0.5,
} as const;

export function getMasteryStatus(mastery: number): MasteryStatus {
  if (mastery >= MASTERY_THRESHOLDS.mastered) return 'mastered';
  if (mastery >= MASTERY_THRESHOLDS.developing) return 'developing';
  return 'remediation';
}

// Mastery update algorithm weights
export const MASTERY_WEIGHTS = {
  correctness: 0.7,
  time: 0.2,
  hint: 0.1,
} as const;
