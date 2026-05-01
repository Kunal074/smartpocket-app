import { create } from 'zustand';
import en from '../locales/en';
import hi from '../locales/hi';
import hinglish from '../locales/hinglish';

const dictionaries = { en, hi, hinglish };

export const useLanguageStore = create((set, get) => ({
  language: 'en',
  setLanguage: (lang) => set({ language: lang }),
  t: (key) => {
    const lang = get().language;
    const keys = key.split('.');
    let val = dictionaries[lang];
    for (const k of keys) {
      if (!val) break;
      val = val[k];
    }
    // Fallback to English if key missing in chosen language
    if (!val) {
      let fallback = dictionaries['en'];
      for (const k of keys) {
        if (!fallback) break;
        fallback = fallback[k];
      }
      return fallback || key;
    }
    return val;
  }
}));
