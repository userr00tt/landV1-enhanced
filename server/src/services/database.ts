import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class DatabaseService {
  static async getUser(telegramId: string) {
    return await prisma.user.findUnique({
      where: { id: telegramId }
    });
  }

  static async createOrUpdateUser(telegramId: string, username?: string) {
    return await prisma.user.upsert({
      where: { id: telegramId },
      update: { username, updatedAt: new Date() },
      create: {
        id: telegramId,
        username,
        plan: 'free',
        dailyTokenLimit: parseInt(process.env.FREE_DAILY_TOKENS || '1000'),
        tokensUsedToday: 0,
        creditsStars: 0,
        lastResetAt: new Date()
      }
    });
  }

  static async updateUserTokenUsage(telegramId: string, tokensUsed: number) {
    const user = await this.getUser(telegramId);
    if (!user) throw new Error('User not found');

    const now = new Date();
    const lastReset = new Date(user.lastResetAt);
    const shouldReset = now.getTime() - lastReset.getTime() > 24 * 60 * 60 * 1000;

    if (shouldReset) {
      return await prisma.user.update({
        where: { id: telegramId },
        data: {
          tokensUsedToday: tokensUsed,
          lastResetAt: now
        }
      });
    } else {
      return await prisma.user.update({
        where: { id: telegramId },
        data: {
          tokensUsedToday: user.tokensUsedToday + tokensUsed
        }
      });
    }
  }

  static async createPayment(telegramId: string, amountStars: number, payload?: string) {
    return await prisma.payment.create({
      data: {
        userId: telegramId,
        amountStars,
        payload,
        status: 'pending'
      }
    });
  }

  static async getPaymentById(paymentId: string) {
    return await prisma.payment.findUnique({ where: { id: paymentId } });
  }

  static async markPaymentPaidIfNot(paymentId: string) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) return null;
    if (payment.status === 'paid') return payment;
    return await prisma.payment.update({ where: { id: paymentId }, data: { status: 'paid' } });
  }

  static async updatePaymentStatus(paymentId: string, status: string) {
    return await prisma.payment.update({
      where: { id: paymentId },
      data: { status }
    });
  }

  static async addUserCredits(telegramId: string, stars: number) {
    return await prisma.user.update({
      where: { id: telegramId },
      data: {
        creditsStars: { increment: stars },
        plan: 'pro',
        dailyTokenLimit: parseInt(process.env.PAID_DAILY_TOKENS || '10000')
      }
    });
  }

  static async saveMessage(telegramId: string, role: string, content: string, tokens: number, conversationId?: string) {
    return await prisma.message.create({
      data: {
        userId: telegramId,
        role,
        content,
        tokens,
        conversationId
      }
    });
  }

  static async getUserMessages(telegramId: string, conversationId?: string, limit = 20) {
    return await prisma.message.findMany({
      where: {
        userId: telegramId,
        ...(conversationId && { conversationId })
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  static async deleteUserCascade(telegramId: string) {
    await prisma.message.deleteMany({ where: { userId: telegramId } });
    await prisma.payment.deleteMany({ where: { userId: telegramId } });
    await prisma.user.deleteMany({ where: { id: telegramId } });
  }
}

export default prisma;
