import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';
import {
  chatWithTutor,
  getConversationHistory,
  getUserConversations,
  deleteConversation,
} from '../services/ai-tutor.service';
import { Language } from '../services/bilingual-content.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/tutor/chat
 * Chat with AI tutor (content-grounded with citations)
 *
 * Body:
 * {
 *   "message": "Explain linear equations",
 *   "conversationId": "...", // optional
 *   "lessonId": "...", // optional
 *   "language": "en" // optional
 * }
 */
router.post('/chat', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  try {
    const { message, conversationId, lessonId, language } = req.body;

    logger.info('POST /api/tutor/chat', {
      userId: req.user?.userId,
      conversationId,
      lessonId,
      messageLength: message?.length,
    });

    // Validate input
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw new AppError('message is required', 400);
    }

    if (message.length > 2000) {
      throw new AppError('message is too long (max 2000 characters)', 400);
    }

    const effectiveLanguage = (language as Language) || 'en';

    // Chat with tutor
    const response = await chatWithTutor(
      req.user!.userId,
      message.trim(),
      conversationId,
      lessonId,
      effectiveLanguage
    );

    const duration = Date.now() - startTime;

    logger.info('Tutor chat completed', {
      userId: req.user?.userId,
      conversationId: response.conversationId,
      duration,
      citationCount: response.citations.length,
    });

    res.json({
      response: response.content,
      citations: response.citations,
      conversationId: response.conversationId,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Tutor chat failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    });
    next(error);
  }
});

/**
 * GET /api/tutor/conversations
 * Get user's conversation history
 *
 * Query Parameters:
 * - limit: number (default: 20)
 */
router.get('/conversations', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;

    logger.info('GET /api/tutor/conversations', {
      userId: req.user?.userId,
      limit,
    });

    const conversations = await getUserConversations(req.user!.userId, limit);

    res.json({
      conversations: conversations.map(c => ({
        _id: c._id,
        title: c.title,
        lessonId: c.lessonId,
        courseId: c.courseId,
        messageCount: c.messages.length,
        lastMessageAt: c.lastMessageAt,
        createdAt: c.createdAt,
      })),
      total: conversations.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tutor/conversations/:id
 * Get specific conversation with full history
 */
router.get('/conversations/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    logger.info('GET /api/tutor/conversations/:id', {
      conversationId: id,
      userId: req.user?.userId,
    });

    const conversation = await getConversationHistory(req.user!.userId, id);

    res.json({
      conversation: {
        _id: conversation._id,
        title: conversation.title,
        lessonId: conversation.lessonId,
        courseId: conversation.courseId,
        messages: conversation.messages,
        context: conversation.context,
        lastMessageAt: conversation.lastMessageAt,
        createdAt: conversation.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tutor/conversations/:id
 * Delete conversation
 */
router.delete('/conversations/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    logger.info('DELETE /api/tutor/conversations/:id', {
      conversationId: id,
      userId: req.user?.userId,
    });

    await deleteConversation(req.user!.userId, id);

    res.json({
      message: 'Conversation deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tutor/feedback
 * Rate tutor response
 *
 * Body:
 * {
 *   "conversationId": "...",
 *   "messageIndex": 5,
 *   "rating": "helpful" | "not-helpful",
 *   "comment": "..." // optional
 * }
 */
router.post('/feedback', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { conversationId, messageIndex, rating, comment } = req.body;

    logger.info('POST /api/tutor/feedback', {
      conversationId,
      messageIndex,
      rating,
      userId: req.user?.userId,
    });

    // Validate input
    if (!conversationId || messageIndex === undefined || !rating) {
      throw new AppError('conversationId, messageIndex, and rating are required', 400);
    }

    if (!['helpful', 'not-helpful'].includes(rating)) {
      throw new AppError('rating must be "helpful" or "not-helpful"', 400);
    }

    // For now, just log the feedback
    // In production, you'd want to store this in the database
    logger.info('Tutor feedback received', {
      userId: req.user?.userId,
      conversationId,
      messageIndex,
      rating,
      comment: comment || 'none',
    });

    res.json({
      message: 'Feedback received successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
