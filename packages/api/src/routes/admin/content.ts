import { Router, Request, Response, NextFunction } from 'express';
import { Course } from '../../models/Course';
import { Module } from '../../models/Module';
import { Lesson } from '../../models/Lesson';
import { Competency } from '../../models/Competency';
import { authenticate, requireRole } from '../../middleware/auth';
import { AppError } from '../../middleware/error-handler';
import { logger } from '../../utils/logger';

const router = Router();

// All admin endpoints require authentication and admin role
router.use(authenticate);
router.use(requireRole(['admin', 'instructor']));

/**
 * POST /api/admin/courses
 * Create new course (draft)
 */
router.post('/courses', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courseData = req.body;

    logger.info('POST /api/admin/courses', { userId: req.user?.userId });

    // Validate required fields
    if (!courseData.slug || !courseData.title?.th || !courseData.metadata) {
      throw new AppError('Missing required fields: slug, title.th, metadata', 400);
    }

    const course = new Course({
      ...courseData,
      published: false, // Always create as draft
    });

    await course.save();

    logger.info('Course created', { courseId: course._id, slug: course.slug, userId: req.user?.userId });

    res.status(201).json({
      message: 'Course created successfully',
      course,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/courses/:id
 * Update course
 */
router.patch('/courses/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    logger.info('PATCH /api/admin/courses/:id', { courseId: id, userId: req.user?.userId });

    const course = await Course.findByIdAndUpdate(id, updates, { new: true });

    if (!course) {
      throw new AppError('Course not found', 404);
    }

    logger.info('Course updated', { courseId: id, userId: req.user?.userId });

    res.json({
      message: 'Course updated successfully',
      course,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/courses/:id
 * Delete course (and all modules/lessons)
 */
router.delete('/courses/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    logger.info('DELETE /api/admin/courses/:id', { courseId: id, userId: req.user?.userId });

    const course = await Course.findById(id);
    if (!course) {
      throw new AppError('Course not found', 404);
    }

    // Delete all modules and lessons
    const modules = await Module.find({ courseId: id });
    for (const module of modules) {
      await Lesson.deleteMany({ moduleId: module._id });
    }
    await Module.deleteMany({ courseId: id });

    // Delete course
    await course.deleteOne();

    logger.info('Course deleted', { courseId: id, userId: req.user?.userId });

    res.json({
      message: 'Course and all related content deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/courses/:id/publish
 * Publish course (draft → published)
 */
router.post('/courses/:id/publish', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    logger.info('POST /api/admin/courses/:id/publish', { courseId: id, userId: req.user?.userId });

    const course = await Course.findById(id).populate('modules').populate('competencies');

    if (!course) {
      throw new AppError('Course not found', 404);
    }

    if (course.published) {
      throw new AppError('Course is already published', 400);
    }

    // Validation before publishing
    if (!course.title.en) {
      logger.warn('Publishing course without English title', { courseId: id });
    }

    if (course.modules.length === 0) {
      throw new AppError('Cannot publish course without modules', 400);
    }

    if (course.competencies.length === 0) {
      throw new AppError('Cannot publish course without competencies', 400);
    }

    // Validate all lessons have at least one competency
    const modules = await Module.find({ courseId: id });
    for (const module of modules) {
      const lessons = await Lesson.find({ moduleId: module._id });
      for (const lesson of lessons) {
        if (lesson.competencies.length === 0) {
          throw new AppError(`Lesson ${lesson._id} has no competencies`, 400);
        }
      }
    }

    course.published = true;
    await course.save();

    logger.info('Course published', { courseId: id, userId: req.user?.userId });

    res.json({
      message: 'Course published successfully',
      course,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/courses/:id/unpublish
 * Unpublish course (published → draft)
 */
router.post('/courses/:id/unpublish', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    logger.info('POST /api/admin/courses/:id/unpublish', { courseId: id, userId: req.user?.userId });

    const course = await Course.findById(id);

    if (!course) {
      throw new AppError('Course not found', 404);
    }

    if (!course.published) {
      throw new AppError('Course is not published', 400);
    }

    course.published = false;
    await course.save();

    logger.info('Course unpublished', { courseId: id, userId: req.user?.userId });

    res.json({
      message: 'Course unpublished successfully',
      course,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/modules
 * Create new module
 */
router.post('/modules', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const moduleData = req.body;

    logger.info('POST /api/admin/modules', { userId: req.user?.userId });

    // Validate course exists
    const course = await Course.findById(moduleData.courseId);
    if (!course) {
      throw new AppError('Course not found', 404);
    }

    const module = new Module(moduleData);
    await module.save();

    // Add module to course
    course.modules.push(module._id as any);
    await course.save();

    logger.info('Module created', { moduleId: module._id, courseId: moduleData.courseId, userId: req.user?.userId });

    res.status(201).json({
      message: 'Module created successfully',
      module,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/modules/:id
 * Update module
 */
router.patch('/modules/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    logger.info('PATCH /api/admin/modules/:id', { moduleId: id, userId: req.user?.userId });

    const module = await Module.findByIdAndUpdate(id, updates, { new: true });

    if (!module) {
      throw new AppError('Module not found', 404);
    }

    logger.info('Module updated', { moduleId: id, userId: req.user?.userId });

    res.json({
      message: 'Module updated successfully',
      module,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/modules/:id
 * Delete module (and all lessons)
 */
router.delete('/modules/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    logger.info('DELETE /api/admin/modules/:id', { moduleId: id, userId: req.user?.userId });

    const module = await Module.findById(id);
    if (!module) {
      throw new AppError('Module not found', 404);
    }

    // Delete all lessons
    await Lesson.deleteMany({ moduleId: id });

    // Remove from course
    await Course.updateOne(
      { _id: module.courseId },
      { $pull: { modules: module._id } }
    );

    // Delete module
    await module.deleteOne();

    logger.info('Module deleted', { moduleId: id, userId: req.user?.userId });

    res.json({
      message: 'Module and all lessons deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/lessons
 * Create new lesson
 */
router.post('/lessons', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lessonData = req.body;

    logger.info('POST /api/admin/lessons', { userId: req.user?.userId });

    // Validate module exists
    const module = await Module.findById(lessonData.moduleId);
    if (!module) {
      throw new AppError('Module not found', 404);
    }

    // Validate competencies exist
    if (!lessonData.competencies || lessonData.competencies.length === 0) {
      throw new AppError('At least one competency is required', 400);
    }

    const competencies = await Competency.find({ _id: { $in: lessonData.competencies } });
    if (competencies.length !== lessonData.competencies.length) {
      throw new AppError('One or more competencies not found', 404);
    }

    // Validate prerequisites if provided
    if (lessonData.metadata?.prerequisites && lessonData.metadata.prerequisites.length > 0) {
      const prerequisites = await Lesson.find({ _id: { $in: lessonData.metadata.prerequisites } });
      if (prerequisites.length !== lessonData.metadata.prerequisites.length) {
        throw new AppError('One or more prerequisite lessons not found', 404);
      }
    }

    const lesson = new Lesson({
      ...lessonData,
      published: false, // Always create as draft
    });

    // Validate prerequisites don't create cycles
    if (lesson.metadata.prerequisites && lesson.metadata.prerequisites.length > 0) {
      const isValid = await Lesson.validatePrerequisites(lesson._id.toString());
      if (!isValid) {
        throw new AppError('Circular prerequisite dependency detected', 400);
      }
    }

    await lesson.save();

    // Add lesson to module
    module.lessons.push(lesson._id as any);
    await module.save();

    logger.info('Lesson created', { lessonId: lesson._id, moduleId: lessonData.moduleId, userId: req.user?.userId });

    res.status(201).json({
      message: 'Lesson created successfully',
      lesson,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/lessons/:id
 * Update lesson
 */
router.patch('/lessons/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    logger.info('PATCH /api/admin/lessons/:id', { lessonId: id, userId: req.user?.userId });

    // Validate prerequisite cycles if updating prerequisites
    if (updates.metadata?.prerequisites) {
      const lesson = await Lesson.findById(id);
      if (lesson) {
        lesson.metadata.prerequisites = updates.metadata.prerequisites;
        const isValid = await Lesson.validatePrerequisites(id);
        if (!isValid) {
          throw new AppError('Circular prerequisite dependency detected', 400);
        }
      }
    }

    const lesson = await Lesson.findByIdAndUpdate(id, updates, { new: true });

    if (!lesson) {
      throw new AppError('Lesson not found', 404);
    }

    logger.info('Lesson updated', { lessonId: id, userId: req.user?.userId });

    res.json({
      message: 'Lesson updated successfully',
      lesson,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/lessons/:id
 * Delete lesson
 */
router.delete('/lessons/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    logger.info('DELETE /api/admin/lessons/:id', { lessonId: id, userId: req.user?.userId });

    const lesson = await Lesson.findById(id);
    if (!lesson) {
      throw new AppError('Lesson not found', 404);
    }

    // Remove from module
    await Module.updateOne(
      { _id: lesson.moduleId },
      { $pull: { lessons: lesson._id } }
    );

    // Delete lesson
    await lesson.deleteOne();

    logger.info('Lesson deleted', { lessonId: id, userId: req.user?.userId });

    res.json({
      message: 'Lesson deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/lessons/:id/publish
 * Publish lesson
 */
router.post('/lessons/:id/publish', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    logger.info('POST /api/admin/lessons/:id/publish', { lessonId: id, userId: req.user?.userId });

    const lesson = await Lesson.findById(id);

    if (!lesson) {
      throw new AppError('Lesson not found', 404);
    }

    if (lesson.published) {
      throw new AppError('Lesson is already published', 400);
    }

    // Validate lesson has competencies
    if (lesson.competencies.length === 0) {
      throw new AppError('Cannot publish lesson without competencies', 400);
    }

    // Validate lesson has content in at least Thai
    if (!lesson.content.th) {
      throw new AppError('Lesson must have Thai content', 400);
    }

    lesson.published = true;
    await lesson.save();

    logger.info('Lesson published', { lessonId: id, userId: req.user?.userId });

    res.json({
      message: 'Lesson published successfully',
      lesson,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/competencies
 * Create new competency
 */
router.post('/competencies', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const competencyData = req.body;

    logger.info('POST /api/admin/competencies', { userId: req.user?.userId });

    // Validate course exists
    const course = await Course.findById(competencyData.courseId);
    if (!course) {
      throw new AppError('Course not found', 404);
    }

    // Validate prerequisites if provided
    if (competencyData.prerequisites && competencyData.prerequisites.length > 0) {
      const prerequisites = await Competency.find({ _id: { $in: competencyData.prerequisites } });
      if (prerequisites.length !== competencyData.prerequisites.length) {
        throw new AppError('One or more prerequisite competencies not found', 404);
      }
    }

    const competency = new Competency(competencyData);
    await competency.save();

    // Validate DAG (no cycles)
    const isValid = await Competency.validateDAG(competency._id.toString());
    if (!isValid) {
      await competency.deleteOne();
      throw new AppError('Circular competency dependency detected', 400);
    }

    // Add to course
    course.competencies.push(competency._id as any);
    await course.save();

    logger.info('Competency created', { competencyId: competency._id, code: competency.code, userId: req.user?.userId });

    res.status(201).json({
      message: 'Competency created successfully',
      competency,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/competencies/:id
 * Update competency
 */
router.patch('/competencies/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    logger.info('PATCH /api/admin/competencies/:id', { competencyId: id, userId: req.user?.userId });

    // Validate DAG if updating prerequisites
    if (updates.prerequisites) {
      const competency = await Competency.findById(id);
      if (competency) {
        competency.prerequisites = updates.prerequisites;
        const isValid = await Competency.validateDAG(id);
        if (!isValid) {
          throw new AppError('Circular competency dependency detected', 400);
        }
      }
    }

    const competency = await Competency.findByIdAndUpdate(id, updates, { new: true });

    if (!competency) {
      throw new AppError('Competency not found', 404);
    }

    logger.info('Competency updated', { competencyId: id, userId: req.user?.userId });

    res.json({
      message: 'Competency updated successfully',
      competency,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
