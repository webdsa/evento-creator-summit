'use client';

import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';

const FLAGS: Record<string, string> = {
  'pt-BR': '🇧🇷',
  es: '🇪🇸',
};

interface LanguageSelectorProps {
  theme?: 'light' | 'dark';
}

export function LanguageSelector({ theme = 'light' }: LanguageSelectorProps) {
  const { language, setLanguage } = useLanguage();
  const isDark = theme === 'dark';

  return (
    <div
      className={
        isDark
          ? 'flex items-center gap-0.5 sm:gap-1 bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl p-1 sm:p-1.5'
          : 'flex items-center gap-0.5 sm:gap-1 bg-white/50 backdrop-blur-sm rounded-lg sm:rounded-xl p-1 sm:p-1.5'
      }
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setLanguage('pt-BR')}
        className={`min-h-[44px] h-9 sm:h-8 px-2.5 sm:px-3 border-0 shadow-none transition-all duration-300 ${
          language === 'pt-BR'
            ? isDark
              ? 'bg-white/20 text-white hover:bg-white/30'
              : 'bg-white/80 text-gray-900 hover:bg-white'
            : isDark
              ? 'text-white/80 hover:bg-white/10 hover:text-white opacity-70 hover:opacity-100'
              : 'text-gray-600 hover:bg-white/70 hover:text-gray-900 opacity-70 hover:opacity-100'
        }`}
        title="Português"
      >
        <span className="text-lg sm:text-xl leading-none" aria-hidden>
          {FLAGS['pt-BR']}
        </span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setLanguage('es')}
        className={`min-h-[44px] h-9 sm:h-8 px-2.5 sm:px-3 border-0 shadow-none transition-all duration-300 ${
          language === 'es'
            ? isDark
              ? 'bg-white/20 text-white hover:bg-white/30'
              : 'bg-white/80 text-gray-900 hover:bg-white'
            : isDark
              ? 'text-white/80 hover:bg-white/10 hover:text-white opacity-70 hover:opacity-100'
              : 'text-gray-600 hover:bg-white/70 hover:text-gray-900 opacity-70 hover:opacity-100'
        }`}
        title="Español"
      >
        <span className="text-lg sm:text-xl leading-none" aria-hidden>
          {FLAGS.es}
        </span>
      </Button>
    </div>
  );
}
