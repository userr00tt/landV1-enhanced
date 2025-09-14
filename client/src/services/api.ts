import axios from 'axios';

const isDev = typeof window !== 'undefined' && (import.meta as any).env?.DEV;
const API_URL = isDev ? '' : ((import.meta as any).env.VITE_API_URL || 'http://localhost:8000');

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

let authToken: string | null = null;
// Initialize from storage on load
try {
  authToken = localStorage.getItem('auth_token');
} catch (_) {}

api.interceptors.request.use((config) => {
  if (!authToken) {
    try {
      authToken = localStorage.getItem('auth_token');
    } catch (_) {}
  }
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      authToken = null;
      localStorage.removeItem('auth_token');
    }
    return Promise.reject(error);
  }
);

export const authService = {
  async login(initData: string) {
    const response = await api.post('/auth/login', { initData });
    authToken = response.data.token;
    try { localStorage.setItem('auth_token', authToken!); } catch {}
    console.debug('[authService.login] received token?', !!authToken, 'len=', (authToken || '').length);
    return response.data;
  },

  setToken(token: string) {
    authToken = token;
    localStorage.setItem('auth_token', token);
  },

  getToken() {
    return authToken || localStorage.getItem('auth_token');
  },

  logout() {
    authToken = null;
    localStorage.removeItem('auth_token');
  }
};

export const chatService = {
  async sendMessage(messages: Array<{ role: string; content: string }>) {
    const token = authToken || authService.getToken();
    const { protocol, hostname, port } = window.location;
    const origin = port ? `${protocol}//${hostname}:${port}` : `${protocol}//${hostname}`;
    const endpoint = `${origin}/api/chat/chat`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ messages, stream: true }),
    });

    if (!response.ok) {
      let code: string | undefined;
      let message: string | undefined;
      try {
        const error = await response.json();
        code = error?.error?.code;
        message = error?.error?.message;
      } catch (_) {}
      const finalMessage = code
        ? `${code}:${message || 'Request failed'}`
        : `HTTP_${response.status}:${response.statusText || 'Request failed'}`;
      throw new Error(finalMessage);
    }

    return response;
  }
};

export const userService = {
  async getUsage() {
    const token = authService.getToken();
    if (!token) {
      throw new Error('NO_TOKEN');
    }
    const { protocol, hostname, port } = window.location;
    const origin = port ? `${protocol}//${hostname}:${port}` : `${protocol}//${hostname}`;
    const endpoint = `${origin}/api/user/usage`;
    const resp = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    if (resp.status === 401) {
      authService.logout();
      throw new Error('UNAUTHORIZED');
    }
    if (!resp.ok) {
      throw new Error(`HTTP_${resp.status}:${resp.statusText}`);
    }
    return await resp.json();
  },

  async getMessages(conversationId?: string, limit = 20) {
    const response = await api.get('/user/messages', {
      params: { conversationId, limit }
    });
    return response.data;
  }
};

export const paymentService = {
  async createInvoice(amountStars: number, description: string) {
    const response = await api.post('/payments/create-invoice', {
      amountStars,
      description
    });
    return response.data;
  }
};

export default api;
