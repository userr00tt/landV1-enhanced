import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifyTelegramWebAppData } from '../utils/telegram';
import { DatabaseService } from '../services/database';
import { AuthenticatedRequest } from '../types';

export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Access token required' } });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || '') as any;
    req.user = { id: decoded.telegramId, username: decoded.username };
    next();
  } catch (error) {
    return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid access token' } });
  }
}

export async function authenticateWebApp(req: Request, res: Response) {
  try {
    const { initData } = req.body;
    
    if (!initData) {
      return res.status(400).json({ error: { code: 'MISSING_INIT_DATA', message: 'Telegram initData required' } });
    }

    let telegramId: string;
    let username: string;

    const allowMock = process.env.ALLOW_MOCK_AUTH === '1';
    if (allowMock && initData === 'mock_init_data_for_development') {
      console.log('Auth: Using mock user data (ALLOW_MOCK_AUTH=1)');
      telegramId = '123456789';
      username = 'testuser';
    } else {
      const botToken = process.env.BOT_TOKEN;
      if (!botToken) {
        return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Bot token not configured' } });
      }

      const webAppData = verifyTelegramWebAppData(initData, botToken);
      if (!webAppData || !webAppData.user) {
        return res.status(401).json({ error: { code: 'INVALID_INIT_DATA', message: 'Invalid Telegram initData' } });
      }

      telegramId = webAppData.user.id.toString();
      username = webAppData.user.username || 'unknown';
    }

    const user = await DatabaseService.createOrUpdateUser(telegramId, username);

    const token = jwt.sign(
      { telegramId, username },
      process.env.JWT_SECRET || '',
      { expiresIn: '5m' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        plan: user.plan,
        tokensUsedToday: user.tokensUsedToday,
        dailyTokenLimit: user.dailyTokenLimit,
        creditsStars: user.creditsStars
      }
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Authentication failed' } });
  }
}
