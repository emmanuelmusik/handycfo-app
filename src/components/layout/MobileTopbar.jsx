import { useEffect } from 'react';
import Icon from './Icon';
import LanguageButton from '../LanguageButton';
import { useT } from '../../lib/i18n';
import logoIcon from '../../assets/logo-icon.png';

export default function MobileTopbar({ onOpenSidebar }) {
  const { t } = useT();
  // Tells the page-level language button to step aside while this bar carries its own.
  useEffect(() => {
    document.body.classList.add('has-topbar');
    return () => document.body.classList.remove('has-topbar');
  }, []);
  return (
    <div className="mobile-topbar">
      <button className="hamburger" onClick={onOpenSidebar} aria-label={t('Open menu')}>
        <Icon name="hamburger" size={18} strokeWidth={2} />
      </button>
      <div className="brand-mark"><img src={logoIcon} alt="HandyCFO" /></div>
      <div className="brand-name">HandyCFO</div>
      <LanguageButton inline />
    </div>
  );
}
