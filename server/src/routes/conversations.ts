import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { DatabaseService } from '../services/database';

const router = Router();

router.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const list = await DatabaseService.listConversations(userId);
  res.json({ conversations: list });
});

router.post('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const schema = z.object({ title: z.string().min(1).max(100).optional() });
  const { title } = schema.parse(req.body || {});
  const conv = await DatabaseService.createConversation(userId, title);
  res.status(201).json({ conversation: conv });
});

router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const ok = await DatabaseService.deleteConversation(userId, req.params.id);
  if (!ok) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Conversation not found' } });
  res.json({ ok: true });
});

router.get('/:id/messages', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const limit = Math.min(parseInt(String(req.query.limit || '50')), 200);
  const msgs = await DatabaseService.getMessagesDecrypted(userId, req.params.id, limit);
  res.json({ messages: msgs });
});

export default router;
