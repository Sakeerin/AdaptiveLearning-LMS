import { Router, Request, Response, NextFunction } from 'express';
import { Quiz } from '../../models/Quiz';
import { QuizItem } from '../../models/QuizItem';
import { QuizAttempt } from '../../models/QuizAttempt';
import { authenticate, requireRole } from '../../middleware/auth';
import { AppError } from '../../middleware/error-handler';
import { logger } from '../../utils/logger';

const router = Router();

// All admin endpoints require authentication and admin/instructor role
router.use(authenticate);
router.use(requireRole(['admin', 'instructor']));

/**
 * POST /api/admin/quiz-items
 * Create new quiz item
 */
router.post('/quiz-items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const itemData = req.body;

    logger.info('POST /api/admin/quiz-items', { userId: req.user?.userId });

    // Validate required fields
    if (!itemData.type || !itemData.question?.th || !itemData.competencyId || !itemData.metadata) {
      throw new AppError('Missing required fields: type, question.th, competencyId, metadata', 400);
    }

    const item = new QuizItem(itemData);
    await item.save();

    logger.info('Quiz item created', { itemId: item._id, type: item.type, userId: req.user?.userId });

    res.status(201).json({
      message: 'Quiz item created successfully',
      item,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/quiz-items/:id
 * Update quiz item
 */
router.patch('/quiz-items/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    logger.info('PATCH /api/admin/quiz-items/:id', { itemId: id, userId: req.user?.userId });

    const item = await QuizItem.findByIdAndUpdate(id, updates, { new: true, runValidators: true });

    if (!item) {
      throw new AppError('Quiz item not found', 404);
    }

    logger.info('Quiz item updated', { itemId: id, userId: req.user?.userId });

    res.json({
      message: 'Quiz item updated successfully',
      item,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/quiz-items/:id
 * Delete quiz item
 */
router.delete('/quiz-items/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    logger.info('DELETE /api/admin/quiz-items/:id', { itemId: id, userId: req.user?.userId });

    const item = await QuizItem.findById(id);
    if (!item) {
      throw new AppError('Quiz item not found', 404);
    }

    // Check if item is used in any quizzes
    const quizzesUsingItem = await Quiz.find({ items: id });
    if (quizzesUsingItem.length > 0) {
      throw new AppError(`Cannot delete item: used in ${quizzesUsingItem.length} quiz(es)`, 400);
    }

    await item.deleteOne();

    logger.info('Quiz item deleted', { itemId: id, userId: req.user?.userId });

    res.json({
      message: 'Quiz item deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/quiz-items/competency/:competencyId
 * Get all quiz items for a competency
 */
router.get('/quiz-items/competency/:competencyId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { competencyId } = req.params;

    logger.info('GET /api/admin/quiz-items/competency/:competencyId', {
      competencyId,
      userId: req.user?.userId,
    });

    const items = await QuizItem.findByCompetency(competencyId);

    res.json({
      items,
      total: items.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/quizzes
 * Create new quiz
 */
router.post('/quizzes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quizData = req.body;

    logger.info('POST /api/admin/quizzes', { userId: req.user?.userId });

    // Validate required fields
    if (!quizData.lessonId || !quizData.title?.th || !quizData.config || !quizData.items) {
      throw new AppError('Missing required fields: lessonId, title.th, config, items', 400);
    }

    // Verify all items exist
    const itemsExist = await QuizItem.find({ _id: { $in: quizData.items } });
    if (itemsExist.length !== quizData.items.length) {
      throw new AppError('One or more quiz items not found', 404);
    }

    const quiz = new Quiz(quizData);
    await quiz.save();

    logger.info('Quiz created', { quizId: quiz._id, lessonId: quizData.lessonId, userId: req.user?.userId });

    res.status(201).json({
      message: 'Quiz created successfully',
      quiz,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/quizzes/:id
 * Update quiz
 */
router.patch('/quizzes/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    logger.info('PATCH /api/admin/quizzes/:id', { quizId: id, userId: req.user?.userId });

    // If updating items, verify they exist
    if (updates.items) {
      const itemsExist = await QuizItem.find({ _id: { $in: updates.items } });
      if (itemsExist.length !== updates.items.length) {
        throw new AppError('One or more quiz items not found', 404);
      }
    }

    const quiz = await Quiz.findByIdAndUpdate(id, updates, { new: true, runValidators: true });

    if (!quiz) {
      throw new AppError('Quiz not found', 404);
    }

    logger.info('Quiz updated', { quizId: id, userId: req.user?.userId });

    res.json({
      message: 'Quiz updated successfully',
      quiz,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/quizzes/:id
 * Delete quiz (and all attempts)
 */
router.delete('/quizzes/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    logger.info('DELETE /api/admin/quizzes/:id', { quizId: id, userId: req.user?.userId });

    const quiz = await Quiz.findById(id);
    if (!quiz) {
      throw new AppError('Quiz not found', 404);
    }

    // Delete all attempts
    await QuizAttempt.deleteMany({ quizId: id });

    // Delete quiz
    await quiz.deleteOne();

    logger.info('Quiz deleted', { quizId: id, userId: req.user?.userId });

    res.json({
      message: 'Quiz and all attempts deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/quizzes/:id/analytics
 * Get quiz analytics (all users)
 */
router.get('/quizzes/:id/analytics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    logger.info('GET /api/admin/quizzes/:id/analytics', {
      quizId: id,
      userId: req.user?.userId,
    });

    const attempts = await QuizAttempt.find({ quizId: id, score: { $exists: true } });

    if (attempts.length === 0) {
      return res.json({
        analytics: {
          totalAttempts: 0,
          uniqueUsers: 0,
          averageScore: null,
          passRate: null,
          scoreDistribution: [],
        },
      });
    }

    const uniqueUsers = new Set(attempts.map(a => a.userId.toString())).size;
    const scores = attempts.map(a => a.score!.percentage);
    const averageScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const passedAttempts = attempts.filter(a => a.score!.percentage >= 70).length;
    const passRate = (passedAttempts / attempts.length) * 100;

    // Score distribution (0-50, 50-70, 70-85, 85-100)
    const scoreDistribution = [
      { range: '0-50', count: scores.filter(s => s < 50).length },
      { range: '50-70', count: scores.filter(s => s >= 50 && s < 70).length },
      { range: '70-85', count: scores.filter(s => s >= 70 && s < 85).length },
      { range: '85-100', count: scores.filter(s => s >= 85).length },
    ];

    res.json({
      analytics: {
        totalAttempts: attempts.length,
        uniqueUsers,
        averageScore,
        passRate,
        scoreDistribution,
      },
      quizId: id,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/quizzes/:id/attempts
 * Get all attempts for a quiz (all users)
 */
router.get('/quizzes/:id/attempts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    logger.info('GET /api/admin/quizzes/:id/attempts', {
      quizId: id,
      limit,
      offset,
      userId: req.user?.userId,
    });

    const attempts = await QuizAttempt.find({ quizId: id })
      .populate('userId', 'email profile')
      .sort({ submittedAt: -1 })
      .skip(offset)
      .limit(limit)
      .exec();

    const total = await QuizAttempt.countDocuments({ quizId: id });

    res.json({
      attempts: attempts.map(a => ({
        _id: a._id,
        user: {
          _id: (a.userId as any)._id,
          email: (a.userId as any).email,
          name: (a.userId as any).profile?.name,
        },
        attemptNumber: a.attemptNumber,
        submittedAt: a.submittedAt,
        score: a.score,
      })),
      total,
      limit,
      offset,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
