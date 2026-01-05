import { XAPIVerb } from '../types/xapi';

/**
 * Standard xAPI verbs used throughout the Adaptive LMS
 * Based on ADL xAPI vocabulary and custom extensions
 */

export const XAPI_VERBS: Record<string, XAPIVerb> = {
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
  // Custom verbs for Adaptive LMS
  tutorAsked: {
    id: 'https://adaptive-lms.com/xapi/verbs/tutor-asked',
    display: { 'en-US': 'asked tutor', 'th-TH': 'ถามผู้สอน AI' },
  },
  tutorRated: {
    id: 'https://adaptive-lms.com/xapi/verbs/tutor-rated',
    display: { 'en-US': 'rated tutor', 'th-TH': 'ให้คะแนนผู้สอน AI' },
  },
  requestedHint: {
    id: 'https://adaptive-lms.com/xapi/verbs/requested-hint',
    display: { 'en-US': 'requested hint', 'th-TH': 'ขอคำใบ้' },
  },
} as const;

/**
 * Custom xAPI extensions used in Adaptive LMS
 */
export const XAPI_EXTENSIONS = {
  platform: 'https://adaptive-lms.com/xapi/ext/platform',
  language: 'https://adaptive-lms.com/xapi/ext/language',
  hints_used: 'https://adaptive-lms.com/xapi/ext/hints_used',
  tutor_mode: 'https://adaptive-lms.com/xapi/ext/tutor_mode',
  tutor_citation_count: 'https://adaptive-lms.com/xapi/ext/tutor_citation_count',
  device_id: 'https://adaptive-lms.com/xapi/ext/device_id',
  mastery_before: 'https://adaptive-lms.com/xapi/ext/mastery_before',
  mastery_after: 'https://adaptive-lms.com/xapi/ext/mastery_after',
} as const;

/**
 * Activity types used in Adaptive LMS
 */
export const XAPI_ACTIVITY_TYPES = {
  course: 'http://adlnet.gov/expapi/activities/course',
  module: 'http://adlnet.gov/expapi/activities/module',
  lesson: 'http://adlnet.gov/expapi/activities/lesson',
  assessment: 'http://adlnet.gov/expapi/activities/assessment',
  question: 'http://adlnet.gov/expapi/activities/question',
  tutorSession: 'https://adaptive-lms.com/xapi/activities/tutor-session',
  competency: 'https://adaptive-lms.com/xapi/activities/competency',
} as const;
