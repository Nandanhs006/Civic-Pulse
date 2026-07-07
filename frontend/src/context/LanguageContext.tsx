import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import en from '../i18n/locales/en';
import { translations, LANGUAGES, DEFAULT_LANG, LangCode } from '../i18n';

type Vars = Record<string, string | number>;

interface LanguageContextType {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: (key: string, vars?: Vars) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function getInitialLang(): LangCode {
  const stored = localStorage.getItem('lang');
  if (stored && LANGUAGES.some((l) => l.code === stored)) return stored as LangCode;
  const nav = navigator.language?.slice(0, 2);
  if (nav && LANGUAGES.some((l) => l.code === nav)) return nav as LangCode;
  return DEFAULT_LANG;
}

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<LangCode>(getInitialLang);

  useEffect(() => {
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (l: LangCode) => setLangState(l);

  // Resolve: current language -> English fallback -> raw key; then interpolate {vars}.
  const t = useCallback(
    (key: string, vars?: Vars): string => {
      const dict = translations[lang] || en;
      let str = dict[key] ?? (en as Record<string, string>)[key] ?? key;
      if (vars) {
        for (const k of Object.keys(vars)) {
          str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(vars[k]));
        }
      }
      return str;
    },
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLang = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used within a LanguageProvider');
  return ctx;
};
