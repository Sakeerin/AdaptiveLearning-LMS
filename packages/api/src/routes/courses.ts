import { Router } from 'express';

const router = Router();

// TODO: Implement in Week 4-5
// GET /api/courses - List all courses
// GET /api/courses/:id - Get course details
// GET /api/courses/:id/modules - Get course modules
// GET /api/modules/:id/lessons - Get module lessons
// GET /api/lessons/:id - Get lesson content (bilingual)
// POST /api/courses/:id/download - Download course for offline (mobile)

router.get('/', (req, res) => {
  res.json({ message: 'Courses endpoint - TODO Week 4' });
});

export default router;
