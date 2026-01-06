import { Router, Request, Response, NextFunction } from 'express';
import { Quiz } from '../models/Quiz';
import { QuizAttempt } from '../models/QuizAttempt';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';
import {
  gradeQuiz,
  updateMasteryFromQuiz,
  getQuizStatistics,
  prepareQuizForUser,
} from '../services/quiz-grading.service';
import { Language } from '../services/bilingual-content.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/quizzes/:id
 * Get quiz for user (sanitized, no correct answers)
 *
 * Query Parameters:
 * - language: 'th' | 'en' (default: 'en')
 */
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const language = (req.query.language as Language) || 'en';

    logger.info('GET /api/quizzes/:id', { quizId: id, userId: req.user?.userId });

    const quiz = await Quiz.findById(id).populate('items');

    if (!quiz) {
      throw new AppError('Quiz not found', 404);
    }

    // Check attempt limit
    const attemptCount = await QuizAttempt.getAttemptCount(req.user!.userId, id);
    const attemptsRemaining = quiz.config.attempts - attemptCount;

    if (attemptsRemaining <= 0) {
      throw new AppError(`No attempts remaining (max ${quiz.config.attempts})`, 400);
    }

    // Prepare quiz (randomize, sanitize)
    const preparedQuiz = prepareQuizForUser(quiz, language);

    // Get statistics
    const statistics = await getQuizStatistics(req.user!.userId, id);

    res.json({
      quiz: preparedQuiz,
      attemptsRemaining,
      statistics,
      language,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/quizzes/:id/submit
 * Submit quiz answers and get results
 *
 * Body:
 * {
 *   "responses": [
 *     {
 *       "itemId": "...",
 *       "response": "option-id" | ["option-1", "option-2"],
 *       "hintsUsed": 0,
 *       "timeTaken": 45
 *     }
 *   ]
 * }
 */
router.post('/:id/submit', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  try {
    const { id } = req.params;
    const { responses } = req.body;

    logger.info('POST /api/quizzes/:id/submit', {
      quizId: id,
      userId: req.user?.userId,
      responseCount: responses?.length,
    });

    // Validate input
    if (!responses || !Array.isArray(responses) || responses.length === 0) {
      throw new AppError('responses array is required', 400);
    }

    // Grade quiz
    const result = await gradeQuiz({
      userId: req.user!.userId,
      quizId: id,
      responses,
    });

    // Update mastery (async, don't wait)
    updateMasteryFromQuiz(req.user!.userId, id, result.attempt._id.toString())
      .then(() => {
        logger.info('Mastery updated from quiz', {
          userId: req.user!.userId,
          quizId: id,
          attemptId: result.attempt._id,
        });
      })
      .catch((error) => {
        logger.error('Failed to update mastery from quiz', {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId: req.user!.userId,
          quizId: id,
        });
      });

    const duration = Date.now() - startTime;

    logger.info('Quiz submitted', {
      quizId: id,
      userId: req.user?.userId,
      score: result.score.percentage,
      passed: result.passed,
      duration,
    });

    res.json({
      message: 'Quiz submitted successfully',
      attempt: {
        _id: result.attempt._id,
        attemptNumber: result.attempt.attemptNumber,
        submittedAt: result.attempt.submittedAt,
      },
      score: result.score,
      responses: result.responses,
      passed: result.passed,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Quiz submission failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    });
    next(error);
  }
});

/**
 * GET /api/quizzes/:id/attempts
 * Get user's quiz attempts
 */
router.get('/:id/attempts', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    logger.info('GET /api/quizzes/:id/attempts', {
      quizId: id,
      userId: req.user?.userId,
    });

    const attempts = await QuizAttempt.findByUserAndQuiz(req.user!.userId, id);

    // Get statistics
    const statistics = await getQuizStatistics(req.user!.userId, id);

    res.json({
      attempts: attempts.map(a => ({
        _id: a._id,
        attemptNumber: a.attemptNumber,
        startedAt: a.startedAt,
        submittedAt: a.submittedAt,
        score: a.score,
        completed: !!a.submittedAt,
      })),
      statistics,
      total: attempts.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/quizzes/:id/attempts/:attemptId
 * Get specific quiz attempt with detailed results
 */
router.get('/:id/attempts/:attemptId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, attemptId } = req.params;
    const language = (req.query.language as Language) || 'en';

    logger.info('GET /api/quizzes/:id/attempts/:attemptId', {
      quizId: id,
      attemptId,
      userId: req.user?.userId,
    });

    const attempt = await QuizAttempt.findById(attemptId)
      .populate({
        path: 'quizId',
        populate: { path: 'items' },
      });

    if (!attempt) {
      throw new AppError('Quiz attempt not found', 404);
    }

    // Verify ownership
    if (attempt.userId.toString() !== req.user!.userId) {
      throw new AppError('Unauthorized', 403);
    }

    // Verify quiz ID matches
    if ((attempt.quizId as any)._id.toString() !== id) {
      throw new AppError('Attempt does not belong to this quiz', 400);
    }

    // Include explanations with responses
    const quiz = attempt.quizId as any;
    const detailedResponses = attempt.responses.map((resp: any) => {
      const item = quiz.items.find((i: any) => i._id.toString() === resp.itemId.toString());

      return {
        ...resp.toObject(),
        question: language === 'en' && item?.question.en ? item.question.en : item?.question.th,
        explanation: language === 'en' && item?.explanation.en ? item.explanation.en : item?.explanation.th,
        correctAnswer: item?.type === 'mcq' || item?.type === 'multi-select'
          ? item.options.filter((opt: any) => opt.correct).map((opt: any) => opt.id)
          : item?.correctAnswer,
      };
    });

    res.json({
      attempt: {
        _id: attempt._id,
        attemptNumber: attempt.attemptNumber,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        score: attempt.score,
      },
      responses: detailedResponses,
      language,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/quizzes/:id/statistics
 * Get quiz statistics for current user
 */
router.get('/:id/statistics', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    logger.info('GET /api/quizzes/:id/statistics', {
      quizId: id,
      userId: req.user?.userId,
    });

    const statistics = await getQuizStatistics(req.user!.userId, id);

    res.json({
      statistics,
      quizId: id,
      userId: req.user!.userId,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
