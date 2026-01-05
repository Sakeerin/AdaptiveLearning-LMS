import { z } from 'zod';
import { BilingualTextSchema } from './user';

export const QuizItemTypeSchema = z.enum(['mcq', 'multi-select', 'short-answer']);
export type QuizItemType = z.infer<typeof QuizItemTypeSchema>;

export const QuizItemOptionSchema = z.object({
  id: z.string(),
  text: BilingualTextSchema,
  correct: z.boolean(),
});
export type QuizItemOption = z.infer<typeof QuizItemOptionSchema>;

export const QuizItemMetadataSchema = z.object({
  difficulty: z.number().min(1).max(5),
  tags: z.array(z.string()).default([]),
});
export type QuizItemMetadata = z.infer<typeof QuizItemMetadataSchema>;

export const QuizItemSchema = z.object({
  _id: z.string(),
  type: QuizItemTypeSchema,
  question: BilingualTextSchema,
  options: z.array(QuizItemOptionSchema).optional(), // for MCQ/multi-select
  correctAnswer: z.string().optional(), // for short-answer
  explanation: BilingualTextSchema,
  competencyId: z.string(),
  metadata: QuizItemMetadataSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type QuizItem = z.infer<typeof QuizItemSchema>;

export const QuizConfigSchema = z.object({
  itemCount: z.number().min(1),
  timeLimit: z.number().optional(), // minutes
  attempts: z.number().default(3),
  randomize: z.boolean().default(true),
  partialCredit: z.boolean().default(false),
});
export type QuizConfig = z.infer<typeof QuizConfigSchema>;

export const QuizSchema = z.object({
  _id: z.string(),
  lessonId: z.string(),
  title: BilingualTextSchema,
  config: QuizConfigSchema,
  items: z.array(z.string()), // QuizItem IDs
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Quiz = z.infer<typeof QuizSchema>;

export const QuizResponseSchema = z.object({
  itemId: z.string(),
  response: z.union([z.string(), z.array(z.string())]), // single or multi-select
  correct: z.boolean(),
  points: z.number(),
  hintsUsed: z.number().default(0),
  timeTaken: z.number().optional(), // seconds
});
export type QuizResponse = z.infer<typeof QuizResponseSchema>;

export const QuizScoreSchema = z.object({
  earned: z.number(),
  possible: z.number(),
  percentage: z.number().min(0).max(100),
});
export type QuizScore = z.infer<typeof QuizScoreSchema>;

export const QuizAttemptSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  quizId: z.string(),
  attemptNumber: z.number(),
  startedAt: z.date(),
  submittedAt: z.date().optional(),
  responses: z.array(QuizResponseSchema),
  score: QuizScoreSchema.optional(),
  xapiStatementIds: z.array(z.string()).default([]), // UUID[]
  syncStatus: z.enum(['pending', 'synced', 'failed']).default('pending'),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type QuizAttempt = z.infer<typeof QuizAttemptSchema>;

// DTOs
export const SubmitQuizDTOSchema = z.object({
  quizId: z.string(),
  responses: z.array(QuizResponseSchema),
});
export type SubmitQuizDTO = z.infer<typeof SubmitQuizDTOSchema>;
