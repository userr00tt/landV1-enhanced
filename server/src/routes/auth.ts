import { Router } from 'express';
import { authenticateWebApp } from '../middleware/auth';
import { authRateLimit } from '../middleware/security';

const router = Router();

router.post('/login', authRateLimit, authenticateWebApp);

export default router;
