import crypto from 'crypto';
import { TelegramWebAppInitData } from '../types';

export function verifyTelegramWebAppData(initData: string, botToken: string): TelegramWebAppInitData | null {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    
    if (!hash) {
      return null;
    }

    urlParams.delete('hash');
    
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (calculatedHash !== hash) {
      return null;
    }

    const authDate = parseInt(urlParams.get('auth_date') || '0');
    const currentTime = Math.floor(Date.now() / 1000);
    
    if (currentTime - authDate > 300) {
      return null;
    }

    const userData = urlParams.get('user');
    let user;
    
    if (userData) {
      try {
        user = JSON.parse(userData);
      } catch {
        return null;
      }
    }

    return {
      user,
      auth_date: authDate,
      hash,
      query_id: urlParams.get('query_id') || undefined
    };
  } catch {
    return null;
  }
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
