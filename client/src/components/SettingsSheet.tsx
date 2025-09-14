import React from 'react';
import { Settings, Shield, Info, Trash2 } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useTelegram } from '../hooks/useTelegram';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  messages: Array<{ role: string; content: string }>;
}

interface SettingsSheetProps {
  children: React.ReactNode;
  conversations: Conversation[];
  activeConversationId: string;
  onNewConversation: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
}

export const SettingsSheet = ({ children, conversations, activeConversationId, onNewConversation, onSelectConversation, onDeleteConversation }: SettingsSheetProps) => {
  const { colorScheme, user, setTheme } = useTelegram();

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Settings
          </SheetTitle>
          <SheetDescription>
            Manage your AI chat preferences and account settings.
          </SheetDescription>
        </SheetHeader>
        
        <div className="space-y-6 mt-6">
          <div>
            <h3 className="font-medium mb-3">Account</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Username:</span>
                <span>{user?.username || 'Not set'}</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <Label htmlFor="theme-switch" className="text-gray-600">Dark theme</Label>
                <Switch id="theme-switch" checked={colorScheme === 'dark'} onCheckedChange={(v) => setTheme(v ? 'dark' : 'light')} />
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div>
            <h3 className="font-medium mb-3">Chat History</h3>
            <div className="space-y-2 text-sm">
              <Button onClick={onNewConversation} variant="outline" size="sm" className="w-full">New Chat</Button>
              <div className="max-h-64 overflow-y-auto divide-y border rounded-md">
                {conversations.map((c) => (
                  <div key={c.id} className={`flex items-center justify-between p-2 ${c.id === activeConversationId ? 'bg-gray-50 dark:bg-gray-800' : ''}`}>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{c.title}</div>
                      <div className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleString()} • {c.messages.length} msgs</div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <Button size="sm" variant="secondary" onClick={() => onSelectConversation(c.id)}>Open</Button>
                      <Button size="icon" variant="ghost" onClick={() => onDeleteConversation(c.id)}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div>
            <h3 className="font-medium mb-3">Privacy & Security</h3>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Shield className="w-4 h-4 mr-2" />
                Privacy Policy
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Info className="w-4 h-4 mr-2" />
                Terms of Service
              </Button>
            </div>
          </div>
          
          <Separator />
          
          <div className="text-xs text-gray-500 space-y-1">
            <p>• Messages are not stored permanently</p>
            <p>• Your data is encrypted in transit</p>
            <p>• We comply with GDPR regulations</p>
            <p>• You can request data deletion anytime</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
