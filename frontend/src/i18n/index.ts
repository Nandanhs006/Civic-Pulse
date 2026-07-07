import en from './locales/en';
import hi from './locales/hi';
import bn from './locales/bn';
import mr from './locales/mr';
import te from './locales/te';
import ta from './locales/ta';
import gu from './locales/gu';
import kn from './locales/kn';
import ml from './locales/ml';
import pa from './locales/pa';
import or from './locales/or';

export type LangCode =
  | 'en' | 'hi' | 'bn' | 'mr' | 'te' | 'ta' | 'gu' | 'kn' | 'ml' | 'pa' | 'or';

export interface LanguageMeta {
  code: LangCode;
  label: string; // English name
  native: string; // endonym
}

export const LANGUAGES: LanguageMeta[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
  { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'or', label: 'Odia', native: 'ଓଡ଼ିଆ' },
];

export const DEFAULT_LANG: LangCode = 'en';

export const translations: Record<LangCode, Record<string, string>> = {
  en, hi, bn, mr, te, ta, gu, kn, ml, pa, or,
};
