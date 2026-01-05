import { Router } from 'express';

const router = Router();

// TODO: Implement in Week 9-10
// POST /api/tutor/chat - Send message to AI tutor (content-only + citations)
// POST /api/tutor/feedback - Rate tutor response
// POST /api/tutor/generate-practice - Generate practice question from content

router.post('/chat', (req, res) => {
  res.json({ message: 'Tutor chat endpoint - TODO Week 9' });
});

router.post('/feedback', (req, res) => {
  res.json({ message: 'Tutor feedback endpoint - TODO Week 10' });
});

export default router;
