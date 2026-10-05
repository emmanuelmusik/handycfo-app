import { useEffect, useRef, useState } from 'react';
import { useT, UI_LANGUAGES } from '../lib/i18n';
import Icon from './layout/Icon';

const NAMES = { en: 'English', de: 'Deutsch', es: 'Español', fr: 'Français', pt: 'Português', it: 'Italiano' };

// Always-visible language switcher, fixed at the top right of the screen.
export default function LanguageButton({ inline = false }) {
  const { t, lang, setLang } = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div className={`lang-switch ${inline ? 'inline' : 'floating'}`} ref={ref}>
      <button className="lang-btn" onClick={() => setOpen((o) => !o)} aria-label={t('Language')} aria-haspopup="menu" aria-expanded={open} title={t('Language')}>
        <Icon name="globe" size={17} strokeWidth={1.8} />
        <span className="lang-code">{lang.toUpperCase()}</span>
      </button>
      {open && (
        <div className="lang-menu" role="menu">
          {UI_LANGUAGES.map((c) => (
            <button key={c} role="menuitemradio" aria-checked={c === lang} className={`lang-item ${c === lang ? 'active' : ''}`}
              onClick={() => { setLang(c); setOpen(false); }}>
              <span>{NAMES[c] || c}</span>
              {c === lang && <Icon name="check" size={14} strokeWidth={2.2} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
