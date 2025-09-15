import { Router, Response } from 'express';
import { z } from 'zod';
import pino from 'pino';
import { authenticateToken } from '../middleware/auth';
import { chatRateLimit } from '../middleware/security';
import { OpenAIService } from '../services/openai';
import { DatabaseService } from '../services/database';
import { AuthenticatedRequest, ChatMessage } from '../types';
import { estimateTokens } from '../utils/telegram';

const logger = pino();

const router = Router();

const chatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1).max(4000)
  })).min(1).max(20),
  stream: z.boolean().optional().default(true)
});

router.post('/chat', authenticateToken, chatRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { messages, stream } = chatSchema.parse(req.body);
    const userId = req.user!.id;

    const user = await DatabaseService.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
    }

    const openaiService = new OpenAIService();
    const maxOutputTokens = parseInt(process.env.MODEL_MAX_OUTPUT_TOKENS || '700');
    const targetInputTokens = parseInt(process.env.MODEL_MAX_INPUT_TOKENS || '3000');
    const trimFn = (openaiService as any).trimContext?.bind(openaiService);
    const trimmedMessages: ChatMessage[] = typeof trimFn === 'function' ? trimFn(messages, targetInputTokens) : messages;
    const inputTokens = openaiService.estimateInputTokens(trimmedMessages);
    const estimatedTotalTokens = inputTokens + maxOutputTokens;

    const bypassQuota = process.env.BYPASS_QUOTA === '1';
    if (!bypassQuota && (user.tokensUsedToday + estimatedTotalTokens > user.dailyTokenLimit)) {
      return res.status(402).json({ 
        error: { 
          code: 'QUOTA_EXCEEDED', 
          message: 'Daily token limit exceeded. Please upgrade your plan.' 
        } 
      });
    }

    const userMessage = trimmedMessages[trimmedMessages.length - 1];
    await DatabaseService.saveMessage(userId, userMessage.role, userMessage.content, estimateTokens(userMessage.content));

    if (stream) {
      const headers: Record<string, string> = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      };
      // Do not fall back to '*'; rely on global CORS middleware
      if (process.env.ORIGIN) {
        headers['Access-Control-Allow-Origin'] = process.env.ORIGIN;
        headers['Vary'] = 'Origin';
      }
      res.writeHead(200, headers);

      let assistantResponse = '';
      let outputTokens = 0;

      try {
        for await (const chunk of openaiService.streamChat(trimmedMessages, maxOutputTokens)) {
          assistantResponse += chunk;
          outputTokens = estimateTokens(assistantResponse);
          
          if (user.tokensUsedToday + inputTokens + outputTokens > user.dailyTokenLimit) {
            res.write(`data: ${JSON.stringify({ type: 'limit_reached', message: 'Token limit reached' })}\n\n`);
            break;
          }

          res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
        }

        await DatabaseService.saveMessage(userId, 'assistant', assistantResponse, outputTokens);
        await DatabaseService.updateUserTokenUsage(userId, inputTokens + outputTokens);

        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
        res.end();
      } catch (error: any) {
        const requestId = req.headers['x-request-id'];
        logger.error({ requestId, err: error?.message }, 'Streaming error');
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to generate response' })}\n\n`);
        res.end();
      }
    } else {
      return res.status(400).json({ error: { code: 'NON_STREAM_NOT_SUPPORTED', message: 'Non-streaming mode not implemented' } });
    }
  } catch (error: any) {
    const requestId = req.headers['x-request-id'];
    logger.error({ requestId, err: error?.message }, 'Chat error');
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request data' } });
    }
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to process chat request' } });
  }
});

export default router;
