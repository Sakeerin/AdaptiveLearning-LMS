import { z } from 'zod';
import { BilingualTextSchema } from './user';

export const CourseMetadataSchema = z.object({
  difficulty: z.number().min(1).max(5),
  estimatedHours: z.number(),
  tags: z.array(z.string()),
});
export type CourseMetadata = z.infer<typeof CourseMetadataSchema>;

export const CourseSchema = z.object({
  _id: z.string(),
  slug: z.string(),
  title: BilingualTextSchema,
  description: BilingualTextSchema,
  modules: z.array(z.string()), // Module IDs
  competencies: z.array(z.string()), // Competency IDs
  published: z.boolean(),
  metadata: CourseMetadataSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Course = z.infer<typeof CourseSchema>;

export const ModuleSchema = z.object({
  _id: z.string(),
  courseId: z.string(),
  title: BilingualTextSchema,
  description: BilingualTextSchema,
  lessons: z.array(z.string()), // Lesson IDs
  order: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Module = z.infer<typeof ModuleSchema>;

export const LessonTypeSchema = z.enum(['video', 'reading', 'quiz', 'practice', 'assignment']);
export type LessonType = z.infer<typeof LessonTypeSchema>;

export const LessonContentSchema = z.object({
  body: z.string().optional(),
  videoUrl: z.string().optional(),
  attachments: z.array(z.string()).optional(),
});
export type LessonContent = z.infer<typeof LessonContentSchema>;

export const AccessibilitySchema = z.object({
  captions: z.string().optional(),
  transcripts: z.string().optional(),
});
export type Accessibility = z.infer<typeof AccessibilitySchema>;

export const LessonMetadataSchema = z.object({
  difficulty: z.number().min(1).max(5),
  estimatedMinutes: z.number(),
  prerequisites: z.array(z.string()).optional(), // Lesson IDs
  tags: z.array(z.string()),
  learningObjectives: z.array(z.string()),
  accessibility: AccessibilitySchema,
});
export type LessonMetadata = z.infer<typeof LessonMetadataSchema>;

export const LessonSchema = z.object({
  _id: z.string(),
  moduleId: z.string(),
  type: LessonTypeSchema,
  content: z.object({
    th: LessonContentSchema.optional(),
    en: LessonContentSchema.optional(),
  }),
  metadata: LessonMetadataSchema,
  competencies: z.array(z.string()).min(1), // mandatory ≥1
  published: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Lesson = z.infer<typeof LessonSchema>;
