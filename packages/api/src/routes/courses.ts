import { Router, Request, Response, NextFunction } from 'express';
import { Course } from '../models/Course';
import { Module } from '../models/Module';
import { Lesson } from '../models/Lesson';
import { Competency } from '../models/Competency';
import { optionalAuthenticate, authenticate } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';
import {
  transformCourse,
  transformModule,
  transformLesson,
  transformCompetency,
  Language,
} from '../services/bilingual-content.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/courses
 * Get all published courses with optional filters
 *
 * Query Parameters:
 * - language: 'th' | 'en' (default: 'en')
 * - tags: comma-separated tags
 */
router.get('/', optionalAuthenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const language = (req.query.language as Language) || 'en';
    const tags = req.query.tags ? (req.query.tags as string).split(',') : undefined;

    logger.info('GET /api/courses', { language, tags, userId: req.user?.userId });

    const courses = await Course.findPublished({ tags });

    // Transform bilingual content based on language
    const transformedCourses = courses.map(course => {
      const courseObj = course.toObject();
      return transformCourse(courseObj, language);
    });

    res.json({
      courses: transformedCourses,
      total: transformedCourses.length,
      language,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/courses/:id
 * Get single course with full details
 *
 * Query Parameters:
 * - language: 'th' | 'en' (default: 'en')
 */
router.get('/:id', optionalAuthenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const language = (req.query.language as Language) || 'en';

    logger.info('GET /api/courses/:id', { courseId: id, language, userId: req.user?.userId });

    const course = await Course.findById(id)
      .populate('modules')
      .populate('competencies');

    if (!course) {
      throw new AppError('Course not found', 404);
    }

    // Only show published courses to non-authenticated users
    if (!req.user && !course.published) {
      throw new AppError('Course not found', 404);
    }

    const courseObj = course.toObject();
    const transformedCourse = transformCourse(courseObj, language);

    res.json({
      course: transformedCourse,
      language,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/courses/:id/modules
 * Get all modules for a course
 *
 * Query Parameters:
 * - language: 'th' | 'en' (default: 'en')
 */
router.get('/:id/modules', optionalAuthenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const language = (req.query.language as Language) || 'en';

    logger.info('GET /api/courses/:id/modules', { courseId: id, language, userId: req.user?.userId });

    // Verify course exists
    const course = await Course.findById(id);
    if (!course) {
      throw new AppError('Course not found', 404);
    }

    if (!req.user && !course.published) {
      throw new AppError('Course not found', 404);
    }

    const modules = await Module.findByCourse(id);

    const transformedModules = modules.map(module => {
      const moduleObj = module.toObject();
      return transformModule(moduleObj, language);
    });

    res.json({
      modules: transformedModules,
      total: transformedModules.length,
      language,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/modules/:id/lessons
 * Get all lessons for a module
 *
 * Query Parameters:
 * - language: 'th' | 'en' (default: 'en')
 */
router.get('/modules/:id/lessons', optionalAuthenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const language = (req.query.language as Language) || 'en';

    logger.info('GET /api/modules/:id/lessons', { moduleId: id, language, userId: req.user?.userId });

    // Verify module exists
    const module = await Module.findById(id).populate('courseId');
    if (!module) {
      throw new AppError('Module not found', 404);
    }

    // Check if course is published
    const course = module.courseId as any;
    if (!req.user && !course.published) {
      throw new AppError('Module not found', 404);
    }

    // Get published lessons only for non-authenticated users
    const lessons = req.user
      ? await Lesson.findByModule(id)
      : await Lesson.findPublishedByModule(id);

    const transformedLessons = lessons.map(lesson => {
      const lessonObj = lesson.toObject();
      return transformLesson(lessonObj, language);
    });

    res.json({
      lessons: transformedLessons,
      total: transformedLessons.length,
      language,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/lessons/:id
 * Get single lesson with full content
 *
 * Query Parameters:
 * - language: 'th' | 'en' (default: 'en')
 */
router.get('/lessons/:id', optionalAuthenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const language = (req.query.language as Language) || 'en';

    logger.info('GET /api/lessons/:id', { lessonId: id, language, userId: req.user?.userId });

    const lesson = await Lesson.findById(id)
      .populate('competencies')
      .populate('metadata.prerequisites');

    if (!lesson) {
      throw new AppError('Lesson not found', 404);
    }

    // Only show published lessons to non-authenticated users
    if (!req.user && !lesson.published) {
      throw new AppError('Lesson not found', 404);
    }

    const lessonObj = lesson.toObject();
    const transformedLesson = transformLesson(lessonObj, language);

    res.json({
      lesson: transformedLesson,
      language,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/competencies/:id
 * Get single competency with prerequisites
 *
 * Query Parameters:
 * - language: 'th' | 'en' (default: 'en')
 */
router.get('/competencies/:id', optionalAuthenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const language = (req.query.language as Language) || 'en';

    logger.info('GET /api/competencies/:id', { competencyId: id, language, userId: req.user?.userId });

    const competency = await Competency.findById(id).populate('prerequisites');

    if (!competency) {
      throw new AppError('Competency not found', 404);
    }

    const competencyObj = competency.toObject();
    const transformedCompetency = transformCompetency(competencyObj, language);

    res.json({
      competency: transformedCompetency,
      language,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/courses/:id/download
 * Download course content for offline use
 * Returns complete course structure with all content
 *
 * Query Parameters:
 * - language: 'th' | 'en' (default: 'en')
 */
router.post('/:id/download', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  try {
    const { id } = req.params;
    const language = (req.query.language as Language) || 'en';

    logger.info('POST /api/courses/:id/download', {
      courseId: id,
      language,
      userId: req.user?.userId,
    });

    // Get course
    const course = await Course.findById(id)
      .populate('competencies');

    if (!course) {
      throw new AppError('Course not found', 404);
    }

    if (!course.published) {
      throw new AppError('Course is not published', 400);
    }

    // Get all modules with lessons
    const modules = await Module.findByCourse(id);
    const modulesWithLessons = await Promise.all(
      modules.map(async (module) => {
        const lessons = await Lesson.findPublishedByModule(module._id.toString());
        return {
          ...module.toObject(),
          lessons: lessons.map(l => l.toObject()),
        };
      })
    );

    // Transform all content to requested language
    const downloadPackage = {
      course: transformCourse(course.toObject(), language),
      modules: modulesWithLessons.map(module => ({
        ...transformModule(module, language),
        lessons: module.lessons.map((lesson: any) => transformLesson(lesson, language)),
      })),
      competencies: course.competencies.map((comp: any) =>
        transformCompetency(comp.toObject(), language)
      ),
      metadata: {
        downloadedAt: new Date().toISOString(),
        language,
        version: '1.0.0',
      },
    };

    const duration = Date.now() - startTime;

    logger.info('Course download package created', {
      courseId: id,
      modulesCount: modulesWithLessons.length,
      lessonsCount: modulesWithLessons.reduce((acc, m) => acc + m.lessons.length, 0),
      duration,
      userId: req.user?.userId,
    });

    res.json(downloadPackage);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Course download failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
      userId: req.user?.userId,
    });
    next(error);
  }
});

export default router;
