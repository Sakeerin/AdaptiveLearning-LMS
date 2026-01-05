import { MASTERY_WEIGHTS } from '../types/mastery';

export interface MasteryUpdateInput {
  currentMastery: number;
  correctness: number; // 0.0-1.0 (quiz score percentage / 100)
  timeOnTask: number; // milliseconds
  expectedTime: number; // milliseconds
  hintsUsed: number;
  attemptNumber: number;
  currentConfidence: number;
}

export interface MasteryUpdateResult {
  newMastery: number;
  newConfidence: number;
}

/**
 * Calculate updated mastery score based on quiz performance
 * This implements the mastery update algorithm from the plan (Week 7)
 */
export function updateMastery(input: MasteryUpdateInput): MasteryUpdateResult {
  const {
    currentMastery,
    correctness,
    timeOnTask,
    expectedTime,
    hintsUsed,
    attemptNumber,
    currentConfidence,
  } = input;

  // Time score: reward faster completion (up to expected time)
  const timeScore = Math.min(1.0, expectedTime / timeOnTask);

  // Hint penalty: 10% reduction per hint used
  const hintScore = Math.max(0, 1 - hintsUsed * 0.1);

  // Weighted combination
  const rawScore =
    correctness * MASTERY_WEIGHTS.correctness +
    timeScore * MASTERY_WEIGHTS.time +
    hintScore * MASTERY_WEIGHTS.hint;

  // Diminishing returns for repeated attempts
  const attemptFactor = 1 / (1 + Math.log(attemptNumber));

  // Exponential moving average with attempt factor
  const alpha = 0.3 * attemptFactor;
  const newMastery = Math.max(
    0,
    Math.min(1, (1 - alpha) * currentMastery + alpha * rawScore)
  );

  // Increase confidence with more data (cap at 1.0)
  const newConfidence = Math.min(1.0, currentConfidence + 0.1);

  return {
    newMastery,
    newConfidence,
  };
}

/**
 * Apply decay to mastery score based on time since last assessment
 * Implements spaced repetition decay (Week 7)
 */
export function applyDecay(mastery: number, daysSinceLastAssessed: number): number {
  const decayRate = 0.05; // 5% decay per week
  const weeksSince = daysSinceLastAssessed / 7;
  return mastery * Math.exp(-decayRate * weeksSince);
}

/**
 * Calculate average mastery across multiple competencies
 */
export function calculateAverageMastery(masteryScores: number[]): number {
  if (masteryScores.length === 0) return 0;
  const sum = masteryScores.reduce((acc, score) => acc + score, 0);
  return sum / masteryScores.length;
}
