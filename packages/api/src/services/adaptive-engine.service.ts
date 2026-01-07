import { Course } from '../models/Course';
import { Module } from '../models/Module';
import { Lesson } from '../models/Lesson';
import { LearnerProgress } from '../models/LearnerProgress';
import { LearnerMastery } from '../models/LearnerMastery';
import { getRecommendations } from './mastery-tracking.service';
import { AppError } from '../middleware/error-handler';
import { logger } from '../utils/logger';

export interface LearningPathItem {
  lessonId: string;
  lessonType: string;
  title: { th: string; en?: string };
  moduleId: string;
  moduleName: { th: string; en?: string };
  order: number;
  status: 'locked' | 'available' | 'in-progress' | 'completed';
  reason: string;
  prerequisitesMet: boolean;
  competencies: Array<{
    competencyId: string;
    code: string;
    name: { th: string; en?: string };
    mastery: number;
    status: string;
  }>;
  estimatedMinutes: number;
  difficulty: number;
}

export interface NextLessonRecommendation {
  lesson: any;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  competenciesToLearn: string[];
  prerequisitesStatus: {
    met: boolean;
    missing: string[];
  };
}

/**
 * Build learning path for a course
 */
export async function buildLearningPath(
  userId: string,
  courseId: string
): Promise<LearningPathItem[]> {
  // Get course with modules and lessons
  const course = await Course.findById(courseId);
  if (!course) {
    throw new AppError('Course not found', 404);
  }

  const modules = await Module.findByCourse(courseId);

  // Get all lessons for the course
  const allLessons: any[] = [];
  for (const module of modules) {
    const lessons = await Lesson.findByModule(module._id.toString());
    allLessons.push(...lessons.map(l => ({ ...l.toObject(), module })));
  }

  // Sort lessons by module order and then by position within module
  allLessons.sort((a, b) => {
    if (a.module.order !== b.module.order) {
      return a.module.order - b.module.order;
    }
    // Within same module, maintain original order
    return 0;
  });

  // Get user's progress
  const progressRecords = await LearnerProgress.findByUserAndCourse(userId, courseId);
  const progressMap = new Map(
    progressRecords.map(p => [p.lessonId.toString(), p])
  );

  // Get user's mastery
  const masteryRecords = await LearnerMastery.findByUser(userId);
  const masteryMap = new Map(
    masteryRecords.map(m => [m.competencyId.toString(), m])
  );

  // Build learning path
  const learningPath: LearningPathItem[] = [];
  let order = 1;

  for (const lesson of allLessons) {
    const lessonId = lesson._id.toString();
    const progress = progressMap.get(lessonId);

    // Check prerequisites
    const prerequisitesMet = await checkLessonPrerequisites(
      userId,
      lesson,
      progressMap,
      masteryMap
    );

    // Determine status
    let status: 'locked' | 'available' | 'in-progress' | 'completed' = 'locked';
    let reason = 'Prerequisites not met';

    if (progress?.status === 'completed') {
      status = 'completed';
      reason = 'Completed';
    } else if (progress?.status === 'in-progress') {
      status = 'in-progress';
      reason = 'In progress';
    } else if (prerequisitesMet) {
      status = 'available';
      reason = 'Ready to start';
    }

    // Get competency details with mastery
    const competencies = await Promise.all(
      lesson.competencies.map(async (comp: any) => {
        const mastery = masteryMap.get(comp._id.toString());
        return {
          competencyId: comp._id.toString(),
          code: comp.code,
          name: comp.name,
          mastery: mastery?.mastery || 0,
          status: mastery ? getMasteryStatus(mastery.mastery) : 'not-started',
        };
      })
    );

    learningPath.push({
      lessonId,
      lessonType: lesson.type,
      title: lesson.title || { th: 'Untitled', en: 'Untitled' },
      moduleId: lesson.module._id.toString(),
      moduleName: lesson.module.title,
      order: order++,
      status,
      reason,
      prerequisitesMet,
      competencies,
      estimatedMinutes: lesson.metadata?.estimatedMinutes || 30,
      difficulty: lesson.metadata?.difficulty || 3,
    });
  }

  return learningPath;
}

/**
 * Get next recommended lesson
 */
export async function getNextLesson(
  userId: string,
  courseId: string
): Promise<NextLessonRecommendation | null> {
  const learningPath = await buildLearningPath(userId, courseId);

  // Filter for available lessons
  const availableLessons = learningPath.filter(
    item => item.status === 'available' || item.status === 'in-progress'
  );

  if (availableLessons.length === 0) {
    return null; // No lessons available
  }

  // Prioritize in-progress lessons
  const inProgressLessons = availableLessons.filter(l => l.status === 'in-progress');
  if (inProgressLessons.length > 0) {
    const lesson = await Lesson.findById(inProgressLessons[0].lessonId).populate('competencies');
    return {
      lesson,
      reason: 'Continue from where you left off',
      priority: 'high',
      competenciesToLearn: inProgressLessons[0].competencies.map(c => c.competencyId),
      prerequisitesStatus: {
        met: true,
        missing: [],
      },
    };
  }

  // Get recommendations based on mastery
  const recommendations = await getRecommendations(userId, courseId);
  const recommendedCompetencyIds = new Set(
    recommendations.nextCompetencies.map(c => c.competencyId)
  );

  // Score available lessons
  const scoredLessons = availableLessons.map(item => {
    let score = 0;

    // Higher score for lessons with recommended competencies
    const hasRecommendedCompetency = item.competencies.some(c =>
      recommendedCompetencyIds.has(c.competencyId)
    );
    if (hasRecommendedCompetency) score += 10;

    // Higher score for lessons with lower average mastery
    const avgMastery = item.competencies.reduce((sum, c) => sum + c.mastery, 0) / item.competencies.length;
    score += (1 - avgMastery) * 5; // 0-5 points

    // Prefer earlier lessons in sequence
    score += (100 - item.order) * 0.1;

    return { ...item, score };
  });

  // Sort by score (highest first)
  scoredLessons.sort((a, b) => b.score - a.score);

  const topLesson = scoredLessons[0];
  const lesson = await Lesson.findById(topLesson.lessonId).populate('competencies');

  return {
    lesson,
    reason: topLesson.competencies.some(c => recommendedCompetencyIds.has(c.competencyId))
      ? 'Recommended based on your learning progress'
      : 'Next in your learning sequence',
    priority: topLesson.score > 15 ? 'high' : topLesson.score > 10 ? 'medium' : 'low',
    competenciesToLearn: topLesson.competencies.map(c => c.competencyId),
    prerequisitesStatus: {
      met: true,
      missing: [],
    },
  };
}

/**
 * Check if lesson prerequisites are met
 */
async function checkLessonPrerequisites(
  userId: string,
  lesson: any,
  progressMap: Map<string, any>,
  masteryMap: Map<string, any>
): Promise<boolean> {
  // Check lesson prerequisites
  if (lesson.metadata?.prerequisites && lesson.metadata.prerequisites.length > 0) {
    for (const prereqId of lesson.metadata.prerequisites) {
      const prereqIdStr = prereqId.toString();
      const prereqProgress = progressMap.get(prereqIdStr);

      // Prerequisite lesson must be completed
      if (!prereqProgress || prereqProgress.status !== 'completed') {
        return false;
      }
    }
  }

  // Check competency prerequisites
  for (const competency of lesson.competencies) {
    if (competency.prerequisites && competency.prerequisites.length > 0) {
      for (const prereqCompId of competency.prerequisites) {
        const prereqCompIdStr = prereqCompId.toString();
        const prereqMastery = masteryMap.get(prereqCompIdStr);

        // Prerequisite competency must be mastered (>= 0.8)
        if (!prereqMastery || prereqMastery.mastery < 0.8) {
          return false;
        }
      }
    }
  }

  return true;
}

/**
 * Get course completion statistics
 */
export async function getCourseCompletion(userId: string, courseId: string) {
  const learningPath = await buildLearningPath(userId, courseId);

  const total = learningPath.length;
  const completed = learningPath.filter(l => l.status === 'completed').length;
  const inProgress = learningPath.filter(l => l.status === 'in-progress').length;
  const available = learningPath.filter(l => l.status === 'available').length;
  const locked = learningPath.filter(l => l.status === 'locked').length;

  const completionPercentage = total > 0 ? (completed / total) * 100 : 0;

  return {
    total,
    completed,
    inProgress,
    available,
    locked,
    completionPercentage,
  };
}

/**
 * Get mastery status label
 */
function getMasteryStatus(mastery: number): string {
  if (mastery >= 0.8) return 'mastered';
  if (mastery >= 0.5) return 'developing';
  return 'not-started';
}

/**
 * Get recommended content based on mastery gaps
 */
export async function getRecommendedContent(userId: string, courseId: string) {
  const recommendations = await getRecommendations(userId, courseId);
  const learningPath = await buildLearningPath(userId, courseId);

  // Find lessons that teach recommended competencies
  const recommendedLessons = learningPath.filter(item => {
    const hasRecommendedComp = item.competencies.some(c =>
      recommendations.nextCompetencies.some(rec => rec.competencyId === c.competencyId)
    );
    return hasRecommendedComp && (item.status === 'available' || item.status === 'in-progress');
  });

  // Find lessons for remediation
  const remediationLessons = learningPath.filter(item => {
    const hasRemediationComp = item.competencies.some(c =>
      recommendations.remediation.some(rem => rem.competencyId === c.competencyId)
    );
    return hasRemediationComp && item.status === 'completed';
  });

  return {
    nextLessons: recommendedLessons.slice(0, 3),
    reviewLessons: remediationLessons.slice(0, 3),
    recommendations,
  };
}
