import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/src/lib/logger';

export type AppLanguage = 'en' | 'sw';

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (next: AppLanguage) => Promise<void>;
  toggleLanguage: () => Promise<void>;
  pick: (en: string, sw: string) => string;
};

const LANGUAGE_KEY = '@tolatola/language';

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLang] = useState<AppLanguage>('en');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(LANGUAGE_KEY);
        if (cancelled) return;
        if (raw === 'en' || raw === 'sw') {
          setLang(raw);
        }
      } catch (err) {
        logger.warn('[LanguageContext] failed to read saved language', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLanguage = useCallback(async (next: AppLanguage) => {
    setLang(next);
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, next);
    } catch (err) {
      logger.warn('[LanguageContext] failed to persist language', err);
    }
  }, []);

  const toggleLanguage = useCallback(async () => {
    await setLanguage(language === 'en' ? 'sw' : 'en');
  }, [language, setLanguage]);

  const pick = useCallback(
    (en: string, sw: string) => {
      return language === 'sw' ? sw : en;
    },
    [language]
  );

  const value = useMemo(
    () => ({ language, setLanguage, toggleLanguage, pick }),
    [language, setLanguage, toggleLanguage, pick]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
