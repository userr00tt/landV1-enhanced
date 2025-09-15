import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ru from './locales/ru.json';

export function setupI18n(initialLang?: string) {
  const lng = (initialLang && (initialLang.startsWith('ru') ? 'ru' : 'en')) || 'en';
  if (!i18n.isInitialized) {
    i18n
      .use(initReactI18next)
      .init({
        resources: { en: { translation: en }, ru: { translation: ru } },
        lng,
        fallbackLng: 'en',
        interpolation: { escapeValue: false },
      });
  } else if (lng && i18n.language !== lng) {
    i18n.changeLanguage(lng);
  }
  return i18n;
}
