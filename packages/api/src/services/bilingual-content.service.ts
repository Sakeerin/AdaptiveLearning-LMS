import { BilingualText } from '@adaptive-lms/shared';
import { logger } from '../utils/logger';

export type Language = 'th' | 'en';

export interface BilingualContentOptions {
  language: Language;
  fallbackLanguage?: Language;
  warnOnFallback?: boolean;
}

/**
 * Get bilingual text with fallback logic
 * Priority: Requested language → Fallback language → Thai (default)
 */
export function getBilingualText(
  content: BilingualText | undefined,
  options: BilingualContentOptions
): string {
  const { language, fallbackLanguage = 'th', warnOnFallback = true } = options;

  if (!content) {
    logger.warn('Bilingual content is undefined');
    return 'Content not available';
  }

  // Try requested language
  if (content[language]) {
    return content[language];
  }

  // Try fallback language
  if (fallbackLanguage && content[fallbackLanguage]) {
    if (warnOnFallback) {
      logger.warn('Using fallback language for content', {
        requested: language,
        fallback: fallbackLanguage,
      });
    }
    return `${content[fallbackLanguage]} [Not available in ${language.toUpperCase()}]`;
  }

  // Final fallback to Thai
  if (content.th) {
    if (warnOnFallback) {
      logger.warn('Using Thai fallback for content', { requested: language });
    }
    return `${content.th} [Not available in ${language.toUpperCase()}]`;
  }

  // No content available
  logger.error('No bilingual content available', { content });
  return 'Content not available';
}

/**
 * Transform bilingual object with fallback
 */
export function transformBilingualContent<T extends { [key: string]: any }>(
  obj: T,
  bilingualFields: (keyof T)[],
  language: Language
): any {
  const result: any = { ...obj };

  for (const field of bilingualFields) {
    const value = obj[field];
    if (value && typeof value === 'object' && ('th' in value || 'en' in value)) {
      result[field] = getBilingualText(value as BilingualText, { language, warnOnFallback: false });
    }
  }

  return result;
}

/**
 * Transform course with bilingual content
 */
export function transformCourse(course: any, language: Language) {
  return {
    ...course,
    title: getBilingualText(course.title, { language, warnOnFallback: false }),
    description: getBilingualText(course.description, { language, warnOnFallback: false }),
  };
}

/**
 * Transform module with bilingual content
 */
export function transformModule(module: any, language: Language) {
  return {
    ...module,
    title: getBilingualText(module.title, { language, warnOnFallback: false }),
    description: getBilingualText(module.description, { language, warnOnFallback: false }),
  };
}

/**
 * Transform lesson with bilingual content
 */
export function transformLesson(lesson: any, language: Language) {
  const content = lesson.content?.[language] || lesson.content?.th;
  const contentAvailable = !!lesson.content?.[language];

  return {
    ...lesson,
    content: contentAvailable
      ? content
      : {
          ...content,
          _fallback: true,
          _message: `Content not available in ${language.toUpperCase()}, showing Thai version`
        },
  };
}

/**
 * Transform competency with bilingual content
 */
export function transformCompetency(competency: any, language: Language) {
  return {
    ...competency,
    name: getBilingualText(competency.name, { language, warnOnFallback: false }),
    description: getBilingualText(competency.description, { language, warnOnFallback: false }),
  };
}

/**
 * Check if content exists in language
 */
export function hasContentInLanguage(content: BilingualText | undefined, language: Language): boolean {
  return !!(content && content[language]);
}

/**
 * Get available languages for content
 */
export function getAvailableLanguages(content: BilingualText | undefined): Language[] {
  if (!content) return [];
  const languages: Language[] = [];
  if (content.th) languages.push('th');
  if (content.en) languages.push('en');
  return languages;
}
