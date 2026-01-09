import { Quiz } from '../models/Quiz';
import { QuizItem } from '../models/QuizItem';
import { QuizAttempt } from '../models/QuizAttempt';
import { QuizResponse, QuizScore } from '@adaptive-lms/shared';
import { updateMasteryFromAssessment } from './mastery-tracking.service';
import { handleQuizCompletion } from './gamification.service';
import { AppError } from '../middleware/error-handler';
import { logger } from '../utils/logger';

export interface GradeQuizInput {
  userId: string;
  quizId: string;
  responses: Array<{
    itemId: string;
    response: string | string[];
    hintsUsed?: number;
    timeTaken?: number;
  }>;
}

export interface GradeQuizResult {
  attempt: any;
  score: QuizScore;
  responses: QuizResponse[];
  passed: boolean;
  masteryUpdated: boolean;
  gamification?: {
    xp: number;
    points: number;
    achievements: any[];
  };
}

/**
 * Grade a single quiz item response
 */
export function gradeQuizItem(
  item: any,
  response: string | string[]
): { correct: boolean; points: number } {
  const { type, options, correctAnswer } = item;

  if (type === 'mcq') {
    // Single correct answer
    const correctOption = options.find((opt: any) => opt.correct);
    const correct = response === correctOption.id;
    return { correct, points: correct ? 1 : 0 };
  }

  if (type === 'multi-select') {
    // Multiple correct answers
    const correctOptionIds = options
      .filter((opt: any) => opt.correct)
      .map((opt: any) => opt.id)
      .sort();

    const responseIds = Array.isArray(response) ? response.sort() : [response].sort();

    // All correct options selected, no incorrect options selected
    const correct =
      correctOptionIds.length === responseIds.length &&
      correctOptionIds.every((id: string) => responseIds.includes(id));

    return { correct, points: correct ? 1 : 0 };
  }

  if (type === 'short-answer') {
    // Case-insensitive exact match
    const normalizedResponse = String(response).trim().toLowerCase();
    const normalizedCorrect = correctAnswer.trim().toLowerCase();
    const correct = normalizedResponse === normalizedCorrect;

    return { correct, points: correct ? 1 : 0 };
  }

  return { correct: false, points: 0 };
}

/**
 * Grade quiz and create attempt record
 */
export async function gradeQuiz(input: GradeQuizInput): Promise<GradeQuizResult> {
  const { userId, quizId, responses } = input;

  // Get quiz with items
  const quiz = await Quiz.findById(quizId).populate('items');
  if (!quiz) {
    throw new AppError('Quiz not found', 404);
  }

  // Check attempt limit
  const attemptCount = await QuizAttempt.getAttemptCount(userId, quizId);
  if (attemptCount >= quiz.config.attempts) {
    throw new AppError(`Maximum attempts (${quiz.config.attempts}) reached`, 400);
  }

  // Grade each response
  const gradedResponses: QuizResponse[] = [];
  let totalPoints = 0;
  let earnedPoints = 0;

  for (const resp of responses) {
    const item = quiz.items.find((i: any) => i._id.toString() === resp.itemId);
    if (!item) {
      logger.warn('Quiz item not found in quiz', { itemId: resp.itemId, quizId });
      continue;
    }

    const { correct, points } = gradeQuizItem(item, resp.response);

    gradedResponses.push({
      itemId: resp.itemId,
      response: resp.response,
      correct,
      points,
      hintsUsed: resp.hintsUsed || 0,
      timeTaken: resp.timeTaken,
    });

    totalPoints += 1; // Each item worth 1 point
    earnedPoints += points;
  }

  // Calculate score
  const percentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
  const score: QuizScore = {
    earned: earnedPoints,
    possible: totalPoints,
    percentage,
  };

  // Create attempt record
  const attempt = new QuizAttempt({
    userId,
    quizId,
    attemptNumber: attemptCount + 1,
    startedAt: new Date(),
    submittedAt: new Date(),
    responses: gradedResponses,
    score,
    syncStatus: 'pending',
  });

  await attempt.save();

  logger.info('Quiz graded', {
    userId,
    quizId,
    attemptNumber: attempt.attemptNumber,
    score: percentage,
  });

  // Determine if passed (>= 70%)
  const passed = percentage >= 70;

  // Award gamification rewards (async, don't wait)
  const isPerfect = percentage === 100;
  let gamificationResult;
  try {
    gamificationResult = await handleQuizCompletion(userId, quizId, passed, isPerfect);
    logger.info('Gamification rewards awarded', {
      userId,
      quizId,
      xp: gamificationResult.xp,
      points: gamificationResult.points,
      achievements: gamificationResult.achievements.length
    });
  } catch (error) {
    logger.error('Failed to award gamification rewards:', error);
  }

  return {
    attempt,
    score,
    responses: gradedResponses,
    passed,
    masteryUpdated: false, // Will be updated in updateMasteryFromQuiz
    gamification: gamificationResult
  };
}

/**
 * Update mastery based on quiz performance
 */
export async function updateMasteryFromQuiz(
  userId: string,
  quizId: string,
  attemptId: string
): Promise<void> {
  const attempt = await QuizAttempt.findById(attemptId).populate({
    path: 'quizId',
    populate: { path: 'items', populate: 'competencyId' },
  });

  if (!attempt) {
    throw new AppError('Quiz attempt not found', 404);
  }

  const quiz = attempt.quizId as any;

  // Group responses by competency
  const competencyPerformance = new Map<string, { correct: number; total: number; totalTime: number; hintsUsed: number }>();

  for (const response of attempt.responses) {
    const item = quiz.items.find((i: any) => i._id.toString() === response.itemId.toString());
    if (!item || !item.competencyId) continue;

    const competencyId = item.competencyId._id.toString();

    if (!competencyPerformance.has(competencyId)) {
      competencyPerformance.set(competencyId, { correct: 0, total: 0, totalTime: 0, hintsUsed: 0 });
    }

    const perf = competencyPerformance.get(competencyId)!;
    perf.total += 1;
    if (response.correct) perf.correct += 1;
    perf.totalTime += response.timeTaken || 0;
    perf.hintsUsed += response.hintsUsed || 0;
  }

  // Update mastery for each competency
  for (const [competencyId, perf] of competencyPerformance.entries()) {
    const correctness = perf.correct / perf.total;
    const avgTime = perf.totalTime / perf.total;
    const expectedTime = 60; // 60 seconds per question

    // Get current mastery
    const { getCompetencyMastery } = await import('./mastery-tracking.service');
    const currentMastery = await getCompetencyMastery(userId, competencyId);

    await updateMasteryFromAssessment(userId, competencyId, {
      currentMastery: currentMastery?.mastery || 0,
      correctness,
      timeOnTask: avgTime * 1000, // Convert to ms
      expectedTime: expectedTime * 1000,
      hintsUsed: perf.hintsUsed,
      attemptNumber: attempt.attemptNumber,
      currentConfidence: currentMastery?.confidence || 0,
    });

    logger.info('Mastery updated from quiz', {
      userId,
      competencyId,
      correctness,
      attemptNumber: attempt.attemptNumber,
    });
  }
}

/**
 * Get quiz statistics for a user
 */
export async function getQuizStatistics(userId: string, quizId: string) {
  const attempts = await QuizAttempt.findByUserAndQuiz(userId, quizId);

  if (attempts.length === 0) {
    return {
      attemptCount: 0,
      bestScore: null,
      lastScore: null,
      averageScore: null,
    };
  }

  const scores = attempts.filter(a => a.score).map(a => a.score!.percentage);
  const bestScore = Math.max(...scores);
  const lastScore = attempts[0].score?.percentage || null;
  const averageScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;

  return {
    attemptCount: attempts.length,
    bestScore: bestScore || null,
    lastScore,
    averageScore: averageScore || null,
  };
}

/**
 * Randomize quiz items
 */
export function randomizeQuizItems(items: any[], count: number): any[] {
  if (items.length <= count) {
    // Shuffle all items
    return items.sort(() => Math.random() - 0.5);
  }

  // Select random subset
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Prepare quiz for user (randomize, remove correct answers)
 */
export function prepareQuizForUser(quiz: any, language: 'th' | 'en' = 'en') {
  let items = quiz.items;

  // Randomize if configured
  if (quiz.config.randomize) {
    items = randomizeQuizItems(items, quiz.config.itemCount);
  } else {
    items = items.slice(0, quiz.config.itemCount);
  }

  // Remove correct answers and explanations
  const sanitizedItems = items.map((item: any) => {
    const sanitized: any = {
      _id: item._id,
      type: item.type,
      question: language === 'en' && item.question.en ? item.question.en : item.question.th,
      competencyId: item.competencyId,
      metadata: item.metadata,
    };

    // For MCQ/multi-select, include options without correct flag
    if (item.options) {
      sanitized.options = item.options.map((opt: any) => ({
        id: opt.id,
        text: language === 'en' && opt.text.en ? opt.text.en : opt.text.th,
        // Don't include 'correct' field
      }));

      // Randomize option order
      sanitized.options.sort(() => Math.random() - 0.5);
    }

    return sanitized;
  });

  return {
    _id: quiz._id,
    title: language === 'en' && quiz.title.en ? quiz.title.en : quiz.title.th,
    config: {
      itemCount: quiz.config.itemCount,
      timeLimit: quiz.config.timeLimit,
      attempts: quiz.config.attempts,
    },
    items: sanitizedItems,
  };
}
