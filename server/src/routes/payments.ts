import { Router, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { authenticateToken } from '../middleware/auth';
import { DatabaseService } from '../services/database';
import { AuthenticatedRequest } from '../types';

const router = Router();

const paymentSchema = z.object({
  amountStars: z.number().min(1).max(10000),
  description: z.string().min(1).max(255)
});

router.post('/create-invoice', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { amountStars, description } = paymentSchema.parse(req.body);
    const userId = req.user!.id;

    const payment = await DatabaseService.createPayment(userId, amountStars, description);

    const invoicePayload = {
      title: 'AI Chat Credits',
      description,
      payload: payment.id,
      provider_token: '',
      currency: 'XTR',
      prices: [{ label: 'Credits', amount: amountStars }]
    };

    res.json({
      paymentId: payment.id,
      invoicePayload,
      invoiceUrl: `https://t.me/invoice/${payment.id}`
    });
  } catch (error) {
    console.error('Payment creation error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid payment data' } });
    }
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to create payment' } });
  }
});

router.post('/webhook', async (req, res) => {
  try {
    const secretToken = req.headers['x-telegram-bot-api-secret-token'];
    
    if (secretToken !== process.env.WEBHOOK_SECRET) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid secret token' } });
    }

    const update = req.body;
    // Basic shape guard for successful_payment updates (Telegram Stars)
    const sp = update?.successful_payment;
    if (sp && typeof sp === 'object') {
      const paymentId: string | undefined = sp.invoice_payload;
      const totalAmount: number | undefined = sp.total_amount;
      const telegramId: string | undefined = update?.from?.id?.toString();

      if (!paymentId || !telegramId || typeof totalAmount !== 'number') {
        return res.status(400).json({ error: { code: 'INVALID_WEBHOOK', message: 'Missing payment fields' } });
      }

      // Idempotency: if already paid, do nothing and return ok
      const existing = await DatabaseService.getPaymentById(paymentId);
      if (!existing) {
        // If the record does not exist (edge case), create it as paid to keep consistency
        await DatabaseService.createPayment(telegramId, totalAmount, paymentId);
      } else if (existing.status === 'paid') {
        return res.json({ ok: true, alreadyProcessed: true });
      }

      await DatabaseService.updatePaymentStatus(paymentId, 'paid');
      await DatabaseService.addUserCredits(telegramId, totalAmount);
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Webhook processing failed' } });
  }
});

export default router;
