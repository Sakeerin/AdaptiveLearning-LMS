import { z } from 'zod';
import { LanguageSchema } from './user';

export const TutorModeSchema = z.enum(['explain', 'hint', 'practice']);
export type TutorMode = z.infer<typeof TutorModeSchema>;

export const CitationSchema = z.object({
  lessonId: z.string(),
  section: z.string(),
  timecode: z.number().optional(), // for video lessons (seconds)
});
export type Citation = z.infer<typeof CitationSchema>;

export const TutorMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  citations: z.array(CitationSchema).optional(),
  hintsGiven: z.number().default(0),
  timestamp: z.date(),
});
export type TutorMessage = z.infer<typeof TutorMessageSchema>;

export const TutorSessionSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  lessonId: z.string().optional(),
  courseId: z.string().optional(),
  messages: z.array(TutorMessageSchema),
  language: LanguageSchema,
  xapiStatementIds: z.array(z.string()).default([]),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type TutorSession = z.infer<typeof TutorSessionSchema>;

export const TutorKnowledgeContentSchema = z.object({
  lessonId: z.string(),
  section: z.string(),
  paragraphId: z.string(),
  text: z.object({
    th: z.string().optional(),
    en: z.string().optional(),
  }),
  embedding: z.array(z.number()).optional(), // Float32Array converted to number[]
  videoTimecode: z.number().optional(),
});
export type TutorKnowledgeContent = z.infer<typeof TutorKnowledgeContentSchema>;

export const TutorKnowledgePackSchema = z.object({
  _id: z.string(),
  courseId: z.string(),
  content: z.array(TutorKnowledgeContentSchema),
  approved: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type TutorKnowledgePack = z.infer<typeof TutorKnowledgePackSchema>;

// DTOs
export const TutorChatDTOSchema = z.object({
  sessionId: z.string().optional(),
  question: z.string(),
  mode: TutorModeSchema,
  language: LanguageSchema,
  lessonId: z.string().optional(),
  courseId: z.string().optional(),
});
export type TutorChatDTO = z.infer<typeof TutorChatDTOSchema>;

export const TutorFeedbackDTOSchema = z.object({
  messageId: z.string(),
  rating: z.number().min(1).max(5),
  reason: z.string().optional(),
});
export type TutorFeedbackDTO = z.infer<typeof TutorFeedbackDTOSchema>;

export const GeneratePracticeDTOSchema = z.object({
  competencyId: z.string(),
  difficulty: z.number().min(1).max(5),
  language: LanguageSchema,
});
export type GeneratePracticeDTO = z.infer<typeof GeneratePracticeDTOSchema>;
