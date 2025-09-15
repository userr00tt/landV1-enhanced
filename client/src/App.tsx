import { setupI18n } from './i18n';
import { useState, useEffect, useRef } from 'react';
import { Bot, AlertCircle, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChatMessage } from './components/ChatMessage';

import { ChatInput } from './components/ChatInput';
import { UsageIndicator } from './components/UsageIndicator';
import { SettingsSheet } from './components/SettingsSheet';
import { useTelegram } from './hooks/useTelegram';
import { useTranslation } from 'react-i18next';
import CompanionScreen from './screens/CompanionScreen';

import { authService, chatService, userService } from './services/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

interface UsageInfo {
  tokensUsedToday: number;
  dailyTokenLimit: number;
  creditsStars: number;
  plan: string;
}

function App() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'chat' | 'companion'>('chat');
  const [companionRole, setCompanionRole] = useState<'medic' | 'tarologist' | 'lawyer' | 'fitness' | undefined>(undefined);
  const [messages, setMessages] = useState<Message[]>([]);
  // Naive multi-conversation support (local only)
  type Conversation = { id: string; title: string; messages: Message[]; createdAt: number };
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const raw = localStorage.getItem('conversations');
      if (raw) return JSON.parse(raw);
    } catch {}
    const initial: Conversation = { id: cryptoRandomId(), title: 'Chat 1', messages: [], createdAt: Date.now() };
    try { localStorage.setItem('conversations', JSON.stringify([initial])); } catch {}
    try { localStorage.setItem('activeConversationId', initial.id); } catch {}
    return [initial];
  });
  const [activeConversationId, setActiveConversationId] = useState<string>(() => {
    try { return localStorage.getItem('activeConversationId') || (conversations[0]?.id || ''); } catch { return conversations[0]?.id || ''; }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const { webApp, isReady, showAlert } = useTelegram();

  useEffect(() => {
    try {
      const lang = (webApp?.initDataUnsafe?.user?.language_code as string) || 'en';
      setupI18n(lang);
    } catch {
      setupI18n('en');
    }
  }, [webApp]);

  const [streamingMessage, setStreamingMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const authStartedRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  // Sync messages state with active conversation
  useEffect(() => {
    const current = conversations.find(c => c.id === activeConversationId) || conversations[0];
    setMessages(current?.messages || []);
  }, [activeConversationId]);

  // Persist conversations on change
  useEffect(() => {
    try { localStorage.setItem('conversations', JSON.stringify(conversations)); } catch {}
  }, [conversations]);

  useEffect(() => {
    if (!isReady || !webApp?.initData) return;
    if (authStartedRef.current) return;
    authStartedRef.current = true;
    authenticateUser();
  }, [isReady, webApp]);

  const authenticateUser = async () => {
    try {
      setAuthError(null);
      const res = await authService.login(webApp!.initData);
      if (res?.token) {
        authService.setToken(res.token);
      }
      console.debug('[App] login ok, token in storage?', !!localStorage.getItem('auth_token'));
      setIsAuthenticated(true);
      await loadUsage(true);
    } catch (error: any) {
      console.error('Authentication failed:', error);
      setAuthError(error.response?.data?.error?.message || 'Authentication failed');
    }
  };

  const loadUsage = async (allowRetry = false) => {
    try {
      const usageData = await userService.getUsage();
      console.debug('[App] usage loaded', usageData);
      setUsage(usageData);
    } catch (error: any) {
      const msg = String(error?.message || '');
      const status = (error?.response?.status as number) || 0;
      if (allowRetry || msg === 'NO_TOKEN' || status === 401) {
        try {
          const relog = await authService.login(webApp!.initData);
          if (relog?.token) authService.setToken(relog.token);
          const usageData = await userService.getUsage();
          setUsage(usageData);
          return;
        } catch (e) {
          console.error('Retry login/usage failed:', e);
        }
      }
      console.error('Failed to load usage:', error);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!isAuthenticated || isLoading) return;

    const userMessage: Message = { id: cryptoRandomId(), role: 'user', content, createdAt: Date.now() };
    const newMessages = [...messages, userMessage].sort((a, b) => a.createdAt - b.createdAt);
    setMessages(newMessages);
    setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, messages: newMessages } : c));
    setIsLoading(true);
    setIsStreaming(true);
    setStreamingMessage('');

    const currentConversationId = activeConversationId;

    try {
      const response = await chatService.sendMessage(newMessages.map(({ role, content }) => ({ role, content })));
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('HTTP_0:No response stream available');
      }

      let assistantContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'chunk' && parsed.content) {
              assistantContent += parsed.content;
              if (currentConversationId === activeConversationId) {
                setStreamingMessage(assistantContent);
              }
            } else if (parsed.type === 'limit_reached') {
              setIsStreaming(false);
              const assistantMsg: Message = { id: cryptoRandomId(), role: 'assistant', content: assistantContent, createdAt: Date.now() };
              setMessages(prev => {
                const updated: Message[] = [...prev, assistantMsg];
                setConversations(cs => cs.map(c => c.id === currentConversationId ? { ...c, messages: updated } : c));
                return updated;
              });
              setStreamingMessage('');
              showAlert('Daily token limit reached. Please upgrade your plan.');
              await loadUsage();
              return;
            } else if (parsed.type === 'done') {
              const assistantMsg: Message = { id: cryptoRandomId(), role: 'assistant', content: assistantContent, createdAt: Date.now() };
              setMessages(prev => {
                const updated: Message[] = [...prev, assistantMsg];
                setConversations(cs => cs.map(c => c.id === currentConversationId ? { ...c, messages: updated } : c));
                return updated;
              });
              setStreamingMessage('');
              setIsStreaming(false);
              await loadUsage();
              return;
            } else if (parsed.type === 'error') {
              throw new Error(`STREAM_ERROR:${parsed.message || 'Unknown streaming error'}`);
            }
          } catch {
            continue;
          }
        }
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      setIsStreaming(false);
      setStreamingMessage('');

      const message: string = String(error?.message || 'Request failed');
      if (message.includes('QUOTA_EXCEEDED')) {
        showAlert('Daily token limit exceeded. Please upgrade your plan.');
      } else if (message.includes('RATE_LIMIT')) {
        showAlert('Too many requests. Please wait before trying again.');
      } else if (message.startsWith('HTTP_')) {
        showAlert(message.replace(/^HTTP_/, 'HTTP '));
      } else if (message.startsWith('STREAM_ERROR:')) {
        showAlert(message.replace('STREAM_ERROR:', 'Stream error: '));
      } else {
        showAlert(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <div className="text-center">
          <Bot className="w-12 h-12 mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading Telegram Mini App...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground p-4">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {authError}
            <Button 
              onClick={authenticateUser} 
              variant="outline" 
              size="sm" 
              className="mt-2 w-full"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <div className="text-center">
          <Bot className="w-12 h-12 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-muted-foreground">Authenticating...</p>
        </div>
      </div>
    );
  }

  // Conversation helpers
  function cryptoRandomId() {
    try {
      const arr = new Uint8Array(16);
      (window.crypto || ({} as any)).getRandomValues(arr as any);
      return Array.from(arr).map(x => x.toString(16).padStart(2, '0')).join('');
    } catch {
      return Math.random().toString(36).slice(2, 10);
    }
  }

  const createConversation = () => {
    const c: Conversation = { id: cryptoRandomId(), title: `Chat ${conversations.length + 1}`, messages: [], createdAt: Date.now() };
    const next = [...conversations, c];
    setConversations(next);
    setActiveConversationId(c.id);
    try { localStorage.setItem('activeConversationId', c.id); } catch {}
  };

  const selectConversation = (id: string) => {
    setActiveConversationId(id);
    try { localStorage.setItem('activeConversationId', id); } catch {}
  };

  const deleteConversation = (id: string) => {
    const next = conversations.filter(c => c.id !== id);
    const ensured = next.length ? next : [{ id: cryptoRandomId(), title: 'Chat 1', messages: [], createdAt: Date.now() }];
    setConversations(ensured);
    const active = ensured[0]?.id || '';
    setActiveConversationId(active);
    try { localStorage.setItem('activeConversationId', active); } catch {}
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <div className="flex items-center justify-between p-4 bg-card border-b border-border">
        <SettingsSheet 
          conversations={conversations}
          activeConversationId={activeConversationId}
          onNewConversation={createConversation}
          onSelectConversation={selectConversation}
          onDeleteConversation={deleteConversation}
        >
          <Button variant="ghost" size="sm" aria-label="Menu">
            <Menu className="w-5 h-5" />
          </Button>
        </SettingsSheet>

        <div className="flex items-center gap-6">
          <button
            className={`text-sm ${activeTab==='chat' ? 'font-semibold underline' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('chat')}
          >
            {t('nav.chat', 'Chat')}
          </button>
          <button
            className={`text-sm ${activeTab==='companion' ? 'font-semibold underline' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('companion')}
          >
            {t('nav.companion', 'Companion')}
          </button>
        </div>

        <div className="w-5" />
      </div>

      {activeTab === 'chat' ? (
        <>
          {usage && (
            <UsageIndicator
              tokensUsed={usage.tokensUsedToday}
              tokenLimit={usage.dailyTokenLimit}
              plan={usage.plan}
            />
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <Bot className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-xl font-semibold mb-2">Welcome to AI Chat!</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Start a conversation with our AI assistant. Ask questions, get help, or just chat!
                </p>
              </div>
            )}
            
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={message.content}
              />
            ))}
            
            {isStreaming && streamingMessage && (
              <ChatMessage
                role="assistant"
                content={streamingMessage}
                isStreaming={true}
              />
            )}
            
            <div ref={messagesEndRef} />
          </div>

          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={!isAuthenticated}
            isLoading={isLoading}
          />
        </>
      ) : (
        <div className="flex-1">
          <CompanionScreen value={companionRole} onChange={setCompanionRole} />
        </div>
      )}
    </div>
  );
}

export default App;
