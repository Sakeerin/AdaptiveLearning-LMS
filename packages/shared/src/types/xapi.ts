import { z } from 'zod';
import { LanguageSchema } from './user';

// xAPI 1.0.3 Specification Types

export const XAPIVerbSchema = z.object({
  id: z.string().url(),
  display: z.record(z.string(), z.string()).optional(),
});
export type XAPIVerb = z.infer<typeof XAPIVerbSchema>;

export const XAPIAccountSchema = z.object({
  homePage: z.string().url(),
  name: z.string(),
});
export type XAPIAccount = z.infer<typeof XAPIAccountSchema>;

export const XAPIActorSchema = z.object({
  objectType: z.literal('Agent').default('Agent'),
  name: z.string().optional(),
  mbox: z.string().email().optional(),
  account: XAPIAccountSchema.optional(),
});
export type XAPIActor = z.infer<typeof XAPIActorSchema>;

export const XAPIActivityDefinitionSchema = z.object({
  name: z.record(z.string(), z.string()).optional(),
  description: z.record(z.string(), z.string()).optional(),
  type: z.string().url().optional(),
});
export type XAPIActivityDefinition = z.infer<typeof XAPIActivityDefinitionSchema>;

export const XAPIActivitySchema = z.object({
  id: z.string().url(),
  objectType: z.literal('Activity').default('Activity'),
  definition: XAPIActivityDefinitionSchema.optional(),
});
export type XAPIActivity = z.infer<typeof XAPIActivitySchema>;

export const XAPIScoreSchema = z.object({
  scaled: z.number().min(-1).max(1).optional(),
  raw: z.number().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
});
export type XAPIScore = z.infer<typeof XAPIScoreSchema>;

export const XAPIResultSchema = z.object({
  score: XAPIScoreSchema.optional(),
  success: z.boolean().optional(),
  completion: z.boolean().optional(),
  response: z.string().optional(),
  duration: z.string().optional(), // ISO 8601 duration
  extensions: z.record(z.string(), z.any()).optional(),
});
export type XAPIResult = z.infer<typeof XAPIResultSchema>;

export const XAPIContextActivitiesSchema = z.object({
  parent: z.array(XAPIActivitySchema).optional(),
  grouping: z.array(XAPIActivitySchema).optional(),
  category: z.array(XAPIActivitySchema).optional(),
  other: z.array(XAPIActivitySchema).optional(),
});
export type XAPIContextActivities = z.infer<typeof XAPIContextActivitiesSchema>;

export const XAPIContextSchema = z.object({
  registration: z.string().uuid().optional(),
  instructor: XAPIActorSchema.optional(),
  team: XAPIActorSchema.optional(),
  contextActivities: XAPIContextActivitiesSchema.optional(),
  revision: z.string().optional(),
  platform: z.string().optional(),
  language: LanguageSchema.optional(),
  statement: z.string().uuid().optional(),
  extensions: z.record(z.string(), z.any()).optional(),
});
export type XAPIContext = z.infer<typeof XAPIContextSchema>;

export const XAPIStatementSchema = z.object({
  id: z.string().uuid(),
  actor: XAPIActorSchema,
  verb: XAPIVerbSchema,
  object: XAPIActivitySchema,
  result: XAPIResultSchema.optional(),
  context: XAPIContextSchema.optional(),
  timestamp: z.string().datetime(),
  stored: z.string().datetime().optional(),
  authority: XAPIActorSchema.optional(),
  version: z.literal('1.0.3').default('1.0.3'),
  attachments: z.array(z.any()).optional(),
});
export type XAPIStatement = z.infer<typeof XAPIStatementSchema>;

// Custom extensions for Adaptive LMS
export const XAPI_EXTENSIONS = {
  platform: 'https://adaptive-lms.com/xapi/ext/platform',
  language: 'https://adaptive-lms.com/xapi/ext/language',
  hints_used: 'https://adaptive-lms.com/xapi/ext/hints_used',
  tutor_mode: 'https://adaptive-lms.com/xapi/ext/tutor_mode',
  tutor_citation_count: 'https://adaptive-lms.com/xapi/ext/tutor_citation_count',
} as const;

// Custom verbs for Adaptive LMS
export const XAPI_VERBS = {
  launched: {
    id: 'http://adlnet.gov/expapi/verbs/launched',
    display: { 'en-US': 'launched', 'th-TH': 'เปิด' },
  },
  initialized: {
    id: 'http://adlnet.gov/expapi/verbs/initialized',
    display: { 'en-US': 'initialized', 'th-TH': 'เริ่มต้น' },
  },
  progressed: {
    id: 'http://adlnet.gov/expapi/verbs/progressed',
    display: { 'en-US': 'progressed', 'th-TH': 'ก้าวหน้า' },
  },
  completed: {
    id: 'http://adlnet.gov/expapi/verbs/completed',
    display: { 'en-US': 'completed', 'th-TH': 'เสร็จสิ้น' },
  },
  terminated: {
    id: 'http://adlnet.gov/expapi/verbs/terminated',
    display: { 'en-US': 'terminated', 'th-TH': 'สิ้นสุด' },
  },
  answered: {
    id: 'http://adlnet.gov/expapi/verbs/answered',
    display: { 'en-US': 'answered', 'th-TH': 'ตอบ' },
  },
  passed: {
    id: 'http://adlnet.gov/expapi/verbs/passed',
    display: { 'en-US': 'passed', 'th-TH': 'ผ่าน' },
  },
  failed: {
    id: 'http://adlnet.gov/expapi/verbs/failed',
    display: { 'en-US': 'failed', 'th-TH': 'ไม่ผ่าน' },
  },
  experienced: {
    id: 'http://adlnet.gov/expapi/verbs/experienced',
    display: { 'en-US': 'experienced', 'th-TH': 'ได้รับประสบการณ์' },
  },
  interacted: {
    id: 'http://adlnet.gov/expapi/verbs/interacted',
    display: { 'en-US': 'interacted', 'th-TH': 'โต้ตอบ' },
  },
  tutorAsked: {
    id: 'https://adaptive-lms.com/xapi/verbs/tutor-asked',
    display: { 'en-US': 'asked tutor', 'th-TH': 'ถามผู้สอน AI' },
  },
  tutorRated: {
    id: 'https://adaptive-lms.com/xapi/verbs/tutor-rated',
    display: { 'en-US': 'rated tutor', 'th-TH': 'ให้คะแนนผู้สอน AI' },
  },
} as const;

// Offline queue types
export const OfflineXAPIQueueItemSchema = z.object({
  id: z.string().uuid(),
  statement: XAPIStatementSchema,
  syncStatus: z.enum(['pending', 'syncing', 'synced', 'failed']),
  retryCount: z.number().default(0),
  lastAttempt: z.date().optional(),
  createdAt: z.date(),
});
export type OfflineXAPIQueueItem = z.infer<typeof OfflineXAPIQueueItemSchema>;
