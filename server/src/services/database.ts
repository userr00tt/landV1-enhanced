import { PrismaClient } from '@prisma/client';
import { encrypt, decrypt } from '../utils/crypto';

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

  private static async ensureDefaultConversation(userId: string) {
    const existing = await prisma.conversation.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' }
    });
    if (existing) return existing;
    return await prisma.conversation.create({
      data: { userId, title: 'Default' }
    });
  }

  static async createConversation(userId: string, title?: string) {
    return await prisma.conversation.create({
      data: { userId, title }
    });
  }

  static async listConversations(userId: string) {
    return await prisma.conversation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async deleteConversation(userId: string, conversationId: string) {
    const conv = await prisma.conversation.findFirst({ where: { id: conversationId, userId } });
    if (!conv) return false;
    await prisma.message.deleteMany({ where: { conversationId, userId } });
    await prisma.conversation.delete({ where: { id: conversationId } });
    return true;
  }

  static async addMessage(userId: string, conversationId: string, role: string, contentPlain: string, tokens: number) {
    const { ciphertext, iv, authTag } = encrypt(contentPlain);
    return await prisma.message.create({
      data: {
        userId,
        conversationId,
        role,
        contentEnc: Buffer.concat([ciphertext, authTag]),
        iv,
        tokens
      }
    });
  }

  static async getMessagesDecrypted(userId: string, conversationId: string, limit = 50) {
    const rows = await prisma.message.findMany({
      where: { userId, conversationId },
      orderBy: { createdAt: 'asc' },
      take: limit
    });
    return rows.map((m) => {
      const buf = Buffer.from(m.contentEnc);
      const ciphertext = buf.subarray(0, buf.length - 16);
      const authTag = buf.subarray(buf.length - 16);
      const content = decrypt(ciphertext, Buffer.from(m.iv), authTag);
      return { id: m.id, role: m.role, content, createdAt: m.createdAt };
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
    const conv = conversationId
      ? await prisma.conversation.findFirst({ where: { id: conversationId, userId: telegramId } })
      : await this.ensureDefaultConversation(telegramId);
    if (!conv) throw new Error('Conversation not found or does not belong to user');
    const { ciphertext, iv, authTag } = encrypt(content);
    return await prisma.message.create({
      data: {
        userId: telegramId,
        conversationId: conv.id,
        role,
        contentEnc: Buffer.concat([ciphertext, authTag]),
        iv,
        tokens
      }
    });
  }

  static async getUserMessages(telegramId: string, conversationId?: string, limit = 20) {
    const conv = conversationId
      ? await prisma.conversation.findFirst({ where: { id: conversationId, userId: telegramId } })
      : await this.ensureDefaultConversation(telegramId);
    if (!conv) return [];
    const rows = await prisma.message.findMany({
      where: { userId: telegramId, conversationId: conv.id },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    return rows.map((m) => {
      const buf = Buffer.from(m.contentEnc);
      const ciphertext = buf.subarray(0, buf.length - 16);
      const authTag = buf.subarray(buf.length - 16);
      const content = decrypt(ciphertext, Buffer.from(m.iv), authTag);
      return { id: m.id, role: m.role, content, createdAt: m.createdAt, conversationId: m.conversationId };
    });
  }

  static async deleteUserCascade(telegramId: string) {
    await prisma.message.deleteMany({ where: { userId: telegramId } });
    await prisma.payment.deleteMany({ where: { userId: telegramId } });
    await prisma.user.deleteMany({ where: { id: telegramId } });
  }
}

export default prisma;
