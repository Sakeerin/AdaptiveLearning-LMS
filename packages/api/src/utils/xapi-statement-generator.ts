import { v4 as uuidv4 } from 'uuid';
import { XAPIStatement, XAPI_VERBS, XAPI_EXTENSIONS, XAPI_ACTIVITY_TYPES } from '@adaptive-lms/shared';

/**
 * Utility for generating sample xAPI statements for testing
 */

export interface GenerateStatementOptions {
  userId: string;
  verb: keyof typeof XAPI_VERBS;
  activityId: string;
  activityType?: string;
  result?: {
    score?: { scaled?: number; raw?: number; max?: number };
    success?: boolean;
    completion?: boolean;
    response?: string;
    duration?: string;
  };
  platform?: 'web' | 'ios' | 'android';
  language?: 'th' | 'en';
  extensions?: Record<string, any>;
}

/**
 * Generate a valid xAPI statement
 */
export function generateStatement(options: GenerateStatementOptions): XAPIStatement {
  const {
    userId,
    verb,
    activityId,
    activityType = XAPI_ACTIVITY_TYPES.lesson,
    result,
    platform = 'web',
    language = 'en',
    extensions = {},
  } = options;

  const statementId = uuidv4();
  const timestamp = new Date().toISOString();

  return {
    id: statementId,
    actor: {
      objectType: 'Agent',
      account: {
        homePage: 'https://adaptive-lms.com',
        name: userId,
      },
    },
    verb: XAPI_VERBS[verb],
    object: {
      id: activityId,
      objectType: 'Activity',
      definition: {
        type: activityType,
      },
    },
    ...(result && { result }),
    context: {
      platform,
      language,
      extensions: {
        [XAPI_EXTENSIONS.platform]: platform,
        [XAPI_EXTENSIONS.language]: language,
        ...extensions,
      },
    },
    timestamp,
    version: '1.0.3',
  };
}

/**
 * Generate lesson launch statement
 */
export function generateLessonLaunchedStatement(
  userId: string,
  lessonId: string,
  platform: 'web' | 'ios' | 'android' = 'web',
  language: 'th' | 'en' = 'en'
): XAPIStatement {
  return generateStatement({
    userId,
    verb: 'launched',
    activityId: `https://adaptive-lms.com/lessons/${lessonId}`,
    activityType: XAPI_ACTIVITY_TYPES.lesson,
    platform,
    language,
  });
}

/**
 * Generate lesson completed statement
 */
export function generateLessonCompletedStatement(
  userId: string,
  lessonId: string,
  duration: string = 'PT15M', // ISO 8601 duration (15 minutes)
  platform: 'web' | 'ios' | 'android' = 'web',
  language: 'th' | 'en' = 'en'
): XAPIStatement {
  return generateStatement({
    userId,
    verb: 'completed',
    activityId: `https://adaptive-lms.com/lessons/${lessonId}`,
    activityType: XAPI_ACTIVITY_TYPES.lesson,
    result: {
      completion: true,
      duration,
    },
    platform,
    language,
  });
}

/**
 * Generate quiz answered statement
 */
export function generateQuizAnsweredStatement(
  userId: string,
  quizId: string,
  questionId: string,
  correct: boolean,
  response: string,
  hintsUsed: number = 0,
  platform: 'web' | 'ios' | 'android' = 'web',
  language: 'th' | 'en' = 'en'
): XAPIStatement {
  return generateStatement({
    userId,
    verb: 'answered',
    activityId: `https://adaptive-lms.com/quizzes/${quizId}/questions/${questionId}`,
    activityType: XAPI_ACTIVITY_TYPES.question,
    result: {
      success: correct,
      response,
    },
    platform,
    language,
    extensions: {
      [XAPI_EXTENSIONS.hints_used]: hintsUsed,
    },
  });
}

/**
 * Generate quiz passed/failed statement
 */
export function generateQuizResultStatement(
  userId: string,
  quizId: string,
  passed: boolean,
  score: { raw: number; max: number },
  duration: string = 'PT10M',
  platform: 'web' | 'ios' | 'android' = 'web',
  language: 'th' | 'en' = 'en'
): XAPIStatement {
  return generateStatement({
    userId,
    verb: passed ? 'passed' : 'failed',
    activityId: `https://adaptive-lms.com/quizzes/${quizId}`,
    activityType: XAPI_ACTIVITY_TYPES.assessment,
    result: {
      score: {
        raw: score.raw,
        max: score.max,
        scaled: score.raw / score.max,
      },
      success: passed,
      completion: true,
      duration,
    },
    platform,
    language,
  });
}

/**
 * Generate tutor interaction statement
 */
export function generateTutorAskedStatement(
  userId: string,
  tutorSessionId: string,
  question: string,
  mode: 'explain' | 'hint' | 'practice',
  platform: 'web' | 'ios' | 'android' = 'web',
  language: 'th' | 'en' = 'en'
): XAPIStatement {
  return generateStatement({
    userId,
    verb: 'tutorAsked',
    activityId: `https://adaptive-lms.com/tutor/sessions/${tutorSessionId}`,
    activityType: XAPI_ACTIVITY_TYPES.tutorSession,
    result: {
      response: question,
    },
    platform,
    language,
    extensions: {
      [XAPI_EXTENSIONS.tutor_mode]: mode,
    },
  });
}

/**
 * Generate batch of statements
 */
export function generateBatchStatements(count: number, userId: string): XAPIStatement[] {
  const statements: XAPIStatement[] = [];

  for (let i = 0; i < count; i++) {
    statements.push(generateLessonLaunchedStatement(
      userId,
      `lesson-${i}`,
      i % 3 === 0 ? 'web' : i % 3 === 1 ? 'ios' : 'android',
      i % 2 === 0 ? 'en' : 'th'
    ));
  }

  return statements;
}

/**
 * Generate complete learning session
 */
export function generateLearningSession(
  userId: string,
  lessonId: string,
  quizId: string
): XAPIStatement[] {
  return [
    // 1. Launch lesson
    generateLessonLaunchedStatement(userId, lessonId),

    // 2. Progress through lesson
    generateStatement({
      userId,
      verb: 'progressed',
      activityId: `https://adaptive-lms.com/lessons/${lessonId}`,
      activityType: XAPI_ACTIVITY_TYPES.lesson,
      result: {
        completion: false,
      },
      platform: 'web',
      language: 'en',
    }),

    // 3. Complete lesson
    generateLessonCompletedStatement(userId, lessonId, 'PT20M'),

    // 4. Initialize quiz
    generateStatement({
      userId,
      verb: 'initialized',
      activityId: `https://adaptive-lms.com/quizzes/${quizId}`,
      activityType: XAPI_ACTIVITY_TYPES.assessment,
      platform: 'web',
      language: 'en',
    }),

    // 5. Answer questions
    generateQuizAnsweredStatement(userId, quizId, 'q1', true, 'Option A', 0),
    generateQuizAnsweredStatement(userId, quizId, 'q2', true, 'Option B', 0),
    generateQuizAnsweredStatement(userId, quizId, 'q3', false, 'Option C', 1),

    // 6. Pass quiz
    generateQuizResultStatement(userId, quizId, true, { raw: 2, max: 3 }, 'PT10M'),
  ];
}
