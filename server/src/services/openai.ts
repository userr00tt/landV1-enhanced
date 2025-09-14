import axios from 'axios';
import { ChatMessage } from '../types';
import { estimateTokens } from '../utils/telegram';

export class OpenAIService {
  private apiKey: string;
  private model: string;
  private maxOutputTokens: number;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.model = process.env.OPENAI_MODEL || 'gpt-4';
    this.maxOutputTokens = parseInt(process.env.MODEL_MAX_OUTPUT_TOKENS || '700');
  }

  private trimContext(messages: ChatMessage[], targetInputTokens: number): ChatMessage[] {
    const reversed = [...messages].reverse();
    const result: ChatMessage[] = [];
    let total = 0;
    for (const m of reversed) {
      const t = estimateTokens(m.content);
      if (total + t > targetInputTokens) break;
      result.push(m);
      total += t;
    }
    return result.reverse();
  }

  async *streamChat(messages: ChatMessage[], maxTokens?: number): AsyncGenerator<string, void, unknown> {
    const useMock = process.env.OPENAI_USE_MOCK === '1' || !this.apiKey;
    if (useMock) {
      console.log('OpenAIService: Using MOCK streaming (set OPENAI_USE_MOCK=0 and provide OPENAI_API_KEY to use real API)');
      yield* this.createMockStreamGenerator(messages);
      return;
    }
    console.log('OpenAIService: Using REAL OpenAI', this.model);
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: this.model,
        messages,
        max_tokens: maxTokens || this.maxOutputTokens,
        stream: true,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        responseType: 'stream'
      }
    );

    let buffer = '';
    
    for await (const chunk of response.data) {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            return;
          }
          
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch (error) {
            continue;
          }
        }
      }
    }
  }

  private async *createMockStreamGenerator(messages: ChatMessage[]): AsyncGenerator<string, void, unknown> {
    const lastMessage = messages[messages.length - 1]?.content || 'your message';
    const mockResponse = `Hello! I'm a mock AI assistant running in development mode. I can see you sent: "${lastMessage}". This is a simulated streaming response to test the chat functionality. The system is working correctly! 🤖✨`;
    
    const words = mockResponse.split(' ');
    
    for (const word of words) {
      yield word + ' ';
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  estimateInputTokens(messages: ChatMessage[]): number {
    const totalText = messages.map(m => m.content).join(' ');
    return estimateTokens(totalText);
  }

  calculateCost(inputTokens: number, outputTokens: number): number {
    const inputPrice = parseFloat(process.env.MODEL_PRICE_INPUT || '0.00001');
    const outputPrice = parseFloat(process.env.MODEL_PRICE_OUTPUT || '0.00003');
    return (inputTokens * inputPrice) + (outputTokens * outputPrice);
  }
}
