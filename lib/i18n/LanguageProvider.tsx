'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Language, Dictionary, dictionaries } from './dictionaries';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Dictionary;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

const STORAGE_KEY = 'midiatec_language';

const DEFAULT_LANGUAGE: Language = 'pt-BR';

function detectBrowserLanguage(): Language {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  const browserLang = navigator.language || (navigator as any).userLanguage;
  if (browserLang.startsWith('es')) return 'es';
  return 'pt-BR';
}

function getStoredLanguage(): Language | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'pt-BR' || stored === 'es') return stored;
  return null;
}

function storeLanguage(lang: Language): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, lang);
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);

  useEffect(() => {
    const stored = getStoredLanguage();
    const next = stored ?? detectBrowserLanguage();
    if (stored) {
      setLanguageState(stored);
    } else {
      storeLanguage(next);
      setLanguageState(next);
    }
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    storeLanguage(lang);
    setLanguageState(lang);
  }, []);

  const safeLanguage = language === 'pt-BR' || language === 'es' ? language : 'pt-BR';
  const value: LanguageContextType = {
    language: safeLanguage,
    setLanguage,
    t: dictionaries[safeLanguage],
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
