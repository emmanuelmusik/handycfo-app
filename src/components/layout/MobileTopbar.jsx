import Icon from './Icon';
import { useT } from '../../lib/i18n';
import logoIcon from '../../assets/logo-icon.png';

export default function MobileTopbar({ onOpenSidebar }) {
  const { t } = useT();
  return (
    <div className="mobile-topbar">
      <button className="hamburger" onClick={onOpenSidebar} aria-label={t('Open menu')}>
        <Icon name="hamburger" size={18} strokeWidth={2} />
      </button>
      <div className="brand-mark"><img src={logoIcon} alt="HandyCFO" /></div>
      <div className="brand-name">HandyCFO</div>
    </div>
  );
}
