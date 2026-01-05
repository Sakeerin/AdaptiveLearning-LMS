import { Router } from 'express';

const router = Router();

// TODO: Implement in Week 11
// GET /api/gamification/profile - Get user's gamification profile (XP, badges, streaks)
// GET /api/gamification/leaderboard - Get leaderboard (opt-in users only)

router.get('/profile', (req, res) => {
  res.json({ message: 'Gamification profile endpoint - TODO Week 11' });
});

export default router;
