import { Router } from 'express';

const router = Router();

// TODO: Implement in Week 2
// POST /api/auth/register - Register new user with email + OTP
// POST /api/auth/login - Login with email/password or OAuth
// POST /api/auth/verify-otp - Verify OTP code
// POST /api/auth/refresh - Refresh JWT token
// POST /api/auth/logout - Logout and invalidate session
// POST /api/auth/logout-all - Logout all devices

router.post('/register', (req, res) => {
  res.json({ message: 'Auth register endpoint - TODO Week 2' });
});

router.post('/login', (req, res) => {
  res.json({ message: 'Auth login endpoint - TODO Week 2' });
});

export default router;
