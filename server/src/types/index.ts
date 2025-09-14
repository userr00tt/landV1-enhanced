import { Request } from 'express';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface TelegramWebAppInitData {
  user?: TelegramUser;
  auth_date: number;
  hash: string;
  query_id?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username?: string;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  stream?: boolean;
}

export interface UsageInfo {
  tokensUsedToday: number;
  dailyTokenLimit: number;
  creditsStars: number;
  plan: string;
}

export interface PaymentRequest {
  amountStars: number;
  description: string;
}
