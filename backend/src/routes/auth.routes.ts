import { Router } from 'express';

const router = Router();

// Placeholder for auth routes - to be implemented
router.post('/register', (_req, res) => {
  res.status(501).json({ message: 'Registration endpoint - To be implemented' });
});

router.post('/login', (_req, res) => {
  res.status(501).json({ message: 'Login endpoint - To be implemented' });
});

router.post('/logout', (_req, res) => {
  res.status(501).json({ message: 'Logout endpoint - To be implemented' });
});

router.get('/me', (_req, res) => {
  res.status(501).json({ message: 'Get current user endpoint - To be implemented' });
});

export default router;
