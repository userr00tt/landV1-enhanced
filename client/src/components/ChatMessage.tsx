import { motion } from 'framer-motion';
import { User, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

export const ChatMessage = ({ role, content, isStreaming }: ChatMessageProps) => {
  const isUser = role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'flex gap-3 p-4 rounded-lg',
        isUser 
          ? 'bg-primary text-primary-foreground ml-8' 
          : 'bg-muted text-foreground mr-8'
      )}
    >
      <div className={cn(
        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
        isUser 
          ? 'bg-primary/80 text-primary-foreground' 
          : 'bg-accent text-accent-foreground'
      )}>
        {isUser ? (
          <User className="w-4 h-4" />
        ) : (
          <Bot className="w-4 h-4" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="whitespace-pre-wrap break-words">
          {content}
          {isStreaming && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="inline-block w-2 h-4 bg-current ml-1"
            />
          )}
        </div>
      </div>
    </motion.div>
  );
};
