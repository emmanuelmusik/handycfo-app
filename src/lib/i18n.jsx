import { createContext, useCallback, useContext, useMemo, useState } from 'react';

// Gettext-style: the English sentence is the key. t('Save changes') returns the
// translation when one exists for the chosen language, otherwise the English text.
// Placeholders look like {name}: t('Hello {name}', { name: 'Eva' }).
// Step 2 adds dictionaries to DICTIONARIES; screens need no change.
import de from '../locales/de';
import es from '../locales/es';
import fr from '../locales/fr';
import pt from '../locales/pt';
import it from '../locales/it';

export const UI_LANGUAGES = ['en', 'de', 'es', 'fr', 'pt', 'it'];
const DICTIONARIES = { en: {}, de, es, fr, pt, it };

function pickInitial() {
  try {
    const saved = localStorage.getItem('handycfo.lang');
    if (saved && UI_LANGUAGES.includes(saved)) return saved;
  } catch { /* storage may be unavailable */ }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return UI_LANGUAGES.includes(nav) ? nav : 'en';
}

const I18nContext = createContext({ t: (s, v) => format(s, v), lang: 'en', setLang: () => {} });

function format(text, vars) {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, k) => (vars[k] === undefined ? m : String(vars[k])));
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(pickInitial);
  const setLang = useCallback((l) => {
    if (!UI_LANGUAGES.includes(l)) return;
    setLangState(l);
    try { localStorage.setItem('handycfo.lang', l); } catch { /* ignore */ }
  }, []);
  const value = useMemo(() => ({
    lang,
    setLang,
    t: (text, vars) => format((DICTIONARIES[lang] && DICTIONARIES[lang][text]) || text, vars),
  }), [lang, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useT = () => useContext(I18nContext);
