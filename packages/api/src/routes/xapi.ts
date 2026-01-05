import { Router } from 'express';

const router = Router();

// TODO: Implement in Week 3 - CRITICAL (xAPI LRS)
// POST /xapi/statements - Store single or batch xAPI statements
// GET /xapi/statements - Query statements with filters (actor, verb, activity, since, until)
// GET /xapi/activities/state - Optional for MVP-lite

router.post('/statements', (req, res) => {
  res.json({ message: 'xAPI store endpoint - TODO Week 3 (CRITICAL)' });
});

router.get('/statements', (req, res) => {
  res.json({ message: 'xAPI query endpoint - TODO Week 3 (CRITICAL)' });
});

export default router;
