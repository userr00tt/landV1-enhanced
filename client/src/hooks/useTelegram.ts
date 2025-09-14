import { useEffect, useState } from 'react';
import { TelegramWebApp } from '../types/telegram';

export const useTelegram = () => {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [scheme, setScheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const initTelegram = () => {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        
        if (!tg.initData || tg.initData.trim() === '') {
          console.log('Telegram WebApp detected but no initData, using development mode');
          initDevelopmentMode();
          return;
        }
        
        setWebApp(tg);
        setUser(tg.initDataUnsafe.user);
        
        tg.ready();
        tg.expand();

        // Apply theme from Telegram or persisted override
        let preferred: 'light' | 'dark' = (tg.colorScheme as any) || 'light';
        try {
          const stored = localStorage.getItem('ui_theme') as 'light' | 'dark' | null;
          if (stored === 'light' || stored === 'dark') preferred = stored;
        } catch {}
        setScheme(preferred);
        document.documentElement.classList.toggle('dark', preferred === 'dark');
        setIsReady(true);

        document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#ffffff');
        document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#000000');
        document.documentElement.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color || '#999999');
        document.documentElement.style.setProperty('--tg-theme-link-color', tg.themeParams.link_color || '#2481cc');
        document.documentElement.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color || '#2481cc');
        document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color || '#ffffff');
        document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', tg.themeParams.secondary_bg_color || '#f1f1f1');
      } else {
        console.warn('Telegram WebApp not available. Running in development mode.');
        initDevelopmentMode();
      }
    };

    const initDevelopmentMode = () => {
      const mockWebApp: any = {
          initData: 'mock_init_data_for_development',
          initDataUnsafe: {
            user: {
              id: 123456789,
              first_name: 'Test',
              last_name: 'User',
              username: 'testuser',
              language_code: 'en',
              is_premium: false
            },
            auth_date: Math.floor(Date.now() / 1000),
            hash: 'mock_hash'
          },
          version: '6.0',
          platform: 'web',
          colorScheme: 'light',
          themeParams: {
            bg_color: '#ffffff',
            text_color: '#000000',
            hint_color: '#999999',
            link_color: '#2481cc',
            button_color: '#2481cc',
            button_text_color: '#ffffff',
            secondary_bg_color: '#f1f1f1'
          },
          isExpanded: true,
          viewportHeight: window.innerHeight,
          viewportStableHeight: window.innerHeight,
          headerColor: '#ffffff',
          backgroundColor: '#ffffff',
          isClosingConfirmationEnabled: false,
          ready: () => console.log('Mock WebApp ready'),
          expand: () => console.log('Mock WebApp expand'),
          close: () => console.log('Mock WebApp close'),
          showAlert: (message: string, callback?: () => void) => {
            alert(message);
            callback?.();
          },
          showConfirm: (message: string, callback?: (confirmed: boolean) => void) => {
            const result = confirm(message);
            callback?.(result);
          },
          openInvoice: (url: string, callback?: (status: string) => void) => {
            console.log('Mock openInvoice:', url);
            setTimeout(() => callback?.('paid'), 1000);
          },
          MainButton: {
            setText: (text: string) => console.log('Mock MainButton setText:', text),
            onClick: (_callback: () => void) => console.log('Mock MainButton onClick'),
            show: () => console.log('Mock MainButton show'),
            hide: () => console.log('Mock MainButton hide')
          },
          BackButton: {
            onClick: (_callback: () => void) => console.log('Mock BackButton onClick'),
            show: () => console.log('Mock BackButton show'),
            hide: () => console.log('Mock BackButton hide')
          }
        };
        
      setWebApp(mockWebApp);
      setUser(mockWebApp.initDataUnsafe.user);
      // Apply persisted theme in dev
      let preferred: 'light' | 'dark' = (mockWebApp.colorScheme as any) || 'light';
      try {
        const stored = localStorage.getItem('ui_theme') as 'light' | 'dark' | null;
        if (stored === 'light' || stored === 'dark') preferred = stored;
      } catch {}
      setScheme(preferred);
      document.documentElement.classList.toggle('dark', preferred === 'dark');
      setIsReady(true);
    };

    if (window.Telegram?.WebApp) {
      initTelegram();
    } else {
      const checkTelegram = setInterval(() => {
        if (window.Telegram?.WebApp) {
          clearInterval(checkTelegram);
          initTelegram();
        }
      }, 100);

      setTimeout(() => {
        if (!isReady) {
          clearInterval(checkTelegram);
          initTelegram();
        }
      }, 2000);
    }
  }, [isReady]);

  const close = () => {
    webApp?.close();
  };

  const showMainButton = (text: string, onClick: () => void) => {
    if (webApp?.MainButton) {
      webApp.MainButton.setText(text);
      webApp.MainButton.onClick(onClick);
      webApp.MainButton.show();
    }
  };

  const hideMainButton = () => {
    webApp?.MainButton.hide();
  };

  const showBackButton = (onClick: () => void) => {
    if (webApp?.BackButton) {
      webApp.BackButton.onClick(onClick);
      webApp.BackButton.show();
    }
  };

  const hideBackButton = () => {
    webApp?.BackButton.hide();
  };

  const openInvoice = (url: string, callback?: (status: string) => void) => {
    webApp?.openInvoice(url, callback);
  };

  const showAlert = (message: string, callback?: () => void) => {
    if (webApp?.showAlert) {
      webApp.showAlert(message, callback);
    } else {
      alert(message);
      callback?.();
    }
  };

  

  const setTheme = (mode: 'light' | 'dark') => {
    setScheme(mode);
    document.documentElement.classList.toggle('dark', mode === 'dark');
    try { localStorage.setItem('ui_theme', mode); } catch {}
  };

  return {
    webApp,
    user,
    isReady,
    close,
    showMainButton,
    hideMainButton,
    showBackButton,
    hideBackButton,
    openInvoice,
    showAlert,
    colorScheme: scheme,
    themeParams: webApp?.themeParams || {},
    setTheme
  };
};
