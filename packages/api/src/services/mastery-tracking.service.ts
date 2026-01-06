import { LearnerMastery } from '../models/LearnerMastery';
import { Competency } from '../models/Competency';
import { updateMastery as calculateMastery, MasteryUpdateInput, MasteryUpdateResult } from '@adaptive-lms/shared/utils/mastery-calculator';
import { getMasteryStatus, MasteryStatus } from '@adaptive-lms/shared';
import { logger } from '../utils/logger';

export interface MasterySnapshot {
  competencyId: string;
  competencyCode: string;
  competencyName: { th: string; en?: string };
  mastery: number;
  confidence: number;
  status: MasteryStatus;
  lastAssessed: Date;
  history: Array<{
    timestamp: Date;
    mastery: number;
    confidence: number;
    eventType: string;
  }>;
}

export interface SkillGraphNode {
  competencyId: string;
  code: string;
  name: { th: string; en?: string };
  mastery: number;
  status: MasteryStatus;
  prerequisites: string[];
  dependents: string[];
}

export interface RecommendationResult {
  nextCompetencies: Array<{
    competencyId: string;
    code: string;
    name: { th: string; en?: string };
    reason: string;
    prerequisitesMet: boolean;
  }>;
  remediation: Array<{
    competencyId: string;
    code: string;
    name: { th: string; en?: string };
    mastery: number;
    reason: string;
  }>;
}

/**
 * Get all mastery records for a user
 */
export async function getUserMastery(userId: string): Promise<MasterySnapshot[]> {
  const masteryRecords = await LearnerMastery.findByUser(userId);

  return masteryRecords.map(record => ({
    competencyId: record.competencyId.toString(),
    competencyCode: (record.competencyId as any).code,
    competencyName: (record.competencyId as any).name,
    mastery: record.mastery,
    confidence: record.confidence,
    status: getMasteryStatus(record.mastery),
    lastAssessed: record.lastAssessed,
    history: record.history.slice(-10), // Last 10 entries
  }));
}

/**
 * Get mastery for a specific competency
 */
export async function getCompetencyMastery(
  userId: string,
  competencyId: string
): Promise<MasterySnapshot | null> {
  const record = await LearnerMastery.findByUserAndCompetency(userId, competencyId);

  if (!record) {
    return null;
  }

  return {
    competencyId: record.competencyId.toString(),
    competencyCode: (record.competencyId as any).code,
    competencyName: (record.competencyId as any).name,
    mastery: record.mastery,
    confidence: record.confidence,
    status: getMasteryStatus(record.mastery),
    lastAssessed: record.lastAssessed,
    history: record.history,
  };
}

/**
 * Update mastery based on assessment performance
 */
export async function updateMasteryFromAssessment(
  userId: string,
  competencyId: string,
  input: MasteryUpdateInput
): Promise<MasterySnapshot> {
  // Calculate new mastery using shared algorithm
  const result: MasteryUpdateResult = calculateMastery(input);

  logger.info('Mastery updated from assessment', {
    userId,
    competencyId,
    oldMastery: input.currentMastery,
    newMastery: result.newMastery,
    correctness: input.correctness,
  });

  // Update in database
  const record = await LearnerMastery.updateMastery(
    userId,
    competencyId,
    result.newMastery,
    result.newConfidence,
    'quiz'
  );

  return {
    competencyId: record.competencyId.toString(),
    competencyCode: (record.competencyId as any)?.code || '',
    competencyName: (record.competencyId as any)?.name || { th: '' },
    mastery: record.mastery,
    confidence: record.confidence,
    status: getMasteryStatus(record.mastery),
    lastAssessed: record.lastAssessed,
    history: record.history.slice(-10),
  };
}

/**
 * Apply mastery decay for inactive users
 */
export async function applyMasteryDecay(userId: string, daysSinceLastAssessed: number = 7): Promise<void> {
  await LearnerMastery.applyDecay(userId, daysSinceLastAssessed);
  logger.info('Mastery decay applied', { userId, daysSinceLastAssessed });
}

/**
 * Build skill graph for a course
 */
export async function buildSkillGraph(
  courseId: string,
  userId?: string
): Promise<SkillGraphNode[]> {
  // Get all competencies for the course
  const competencies = await Competency.findByCourse(courseId);

  // Get user's mastery if userId provided
  const masteryMap = new Map<string, number>();
  if (userId) {
    const masteryRecords = await LearnerMastery.findByUser(userId);
    masteryRecords.forEach(record => {
      masteryMap.set(record.competencyId.toString(), record.mastery);
    });
  }

  // Build dependency map
  const dependentsMap = new Map<string, string[]>();
  competencies.forEach(comp => {
    comp.prerequisites.forEach(prereqId => {
      const prereqIdStr = prereqId.toString();
      if (!dependentsMap.has(prereqIdStr)) {
        dependentsMap.set(prereqIdStr, []);
      }
      dependentsMap.get(prereqIdStr)!.push(comp._id.toString());
    });
  });

  // Build graph nodes
  const nodes: SkillGraphNode[] = competencies.map(comp => {
    const compIdStr = comp._id.toString();
    const mastery = masteryMap.get(compIdStr) || 0;

    return {
      competencyId: compIdStr,
      code: comp.code,
      name: comp.name,
      mastery,
      status: getMasteryStatus(mastery),
      prerequisites: comp.prerequisites.map(p => p.toString()),
      dependents: dependentsMap.get(compIdStr) || [],
    };
  });

  return nodes;
}

/**
 * Get recommended next competencies for a user
 */
export async function getRecommendations(
  userId: string,
  courseId: string
): Promise<RecommendationResult> {
  // Get skill graph with user's mastery
  const graph = await buildSkillGraph(courseId, userId);

  // Build mastery map
  const masteryMap = new Map<string, number>();
  graph.forEach(node => {
    masteryMap.set(node.competencyId, node.mastery);
  });

  // Find competencies needing remediation (mastery < 0.5)
  const remediation = graph
    .filter(node => node.mastery > 0 && node.mastery < 0.5)
    .sort((a, b) => a.mastery - b.mastery) // Lowest first
    .slice(0, 5)
    .map(node => ({
      competencyId: node.competencyId,
      code: node.code,
      name: node.name,
      mastery: node.mastery,
      reason: 'Below proficiency threshold (requires review)',
    }));

  // Find next competencies to learn
  const nextCompetencies = graph
    .filter(node => {
      // Not yet mastered
      if (node.mastery >= 0.8) return false;

      // Check if all prerequisites are mastered
      const prerequisitesMet = node.prerequisites.every(prereqId => {
        const prereqMastery = masteryMap.get(prereqId) || 0;
        return prereqMastery >= 0.8;
      });

      return prerequisitesMet;
    })
    .sort((a, b) => {
      // Prioritize by:
      // 1. Already started (mastery > 0)
      // 2. Fewer prerequisites
      // 3. Lower difficulty
      const aStarted = a.mastery > 0 ? 1 : 0;
      const bStarted = b.mastery > 0 ? 1 : 0;
      if (aStarted !== bStarted) return bStarted - aStarted;

      const aPrereqs = a.prerequisites.length;
      const bPrereqs = b.prerequisites.length;
      return aPrereqs - bPrereqs;
    })
    .slice(0, 5)
    .map(node => {
      const prerequisitesMet = node.prerequisites.every(prereqId => {
        const prereqMastery = masteryMap.get(prereqId) || 0;
        return prereqMastery >= 0.8;
      });

      let reason = 'Ready to learn';
      if (node.mastery > 0) {
        reason = 'Continue learning (in progress)';
      } else if (node.prerequisites.length === 0) {
        reason = 'Foundation skill (no prerequisites)';
      }

      return {
        competencyId: node.competencyId,
        code: node.code,
        name: node.name,
        reason,
        prerequisitesMet,
      };
    });

  return {
    nextCompetencies,
    remediation,
  };
}

/**
 * Calculate overall course progress
 */
export async function getCourseProgress(
  userId: string,
  courseId: string
): Promise<{
  totalCompetencies: number;
  mastered: number;
  developing: number;
  notStarted: number;
  averageMastery: number;
}> {
  const graph = await buildSkillGraph(courseId, userId);

  const totalCompetencies = graph.length;
  const mastered = graph.filter(n => n.mastery >= 0.8).length;
  const developing = graph.filter(n => n.mastery >= 0.5 && n.mastery < 0.8).length;
  const notStarted = graph.filter(n => n.mastery === 0).length;

  const masteryScores = graph.map(n => n.mastery);
  const averageMastery = masteryScores.length > 0
    ? masteryScores.reduce((sum, m) => sum + m, 0) / masteryScores.length
    : 0;

  return {
    totalCompetencies,
    mastered,
    developing,
    notStarted,
    averageMastery,
  };
}
