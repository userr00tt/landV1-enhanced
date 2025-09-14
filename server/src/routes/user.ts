import { Router, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { DatabaseService } from '../services/database';
import { AuthenticatedRequest } from '../types';

const router = Router();

router.get('/usage', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await DatabaseService.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
    }

    res.json({
      tokensUsedToday: user.tokensUsedToday,
      dailyTokenLimit: user.dailyTokenLimit,
      creditsStars: user.creditsStars,
      plan: user.plan,
      lastResetAt: user.lastResetAt
    });
  } catch (error) {
    console.error('Usage error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to get usage info' } });
  }
});

router.get('/messages', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const conversationId = req.query.conversationId as string;
    const limit = parseInt(req.query.limit as string) || 20;

    const messages = await DatabaseService.getUserMessages(userId, conversationId, limit);
    
    res.json({
      messages: messages.reverse()
    });
  } catch (error) {
    console.error('Messages error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to get messages' } });
  }
});

export default router;
