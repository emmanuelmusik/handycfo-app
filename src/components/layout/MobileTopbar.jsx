import Icon from './Icon';
import logoIcon from '../../assets/logo-icon.png';

export default function MobileTopbar({ onOpenSidebar }) {
  return (
    <div className="mobile-topbar">
      <button className="hamburger" onClick={onOpenSidebar} aria-label="Open menu">
        <Icon name="hamburger" size={18} strokeWidth={2} />
      </button>
      <div className="brand-mark"><img src={logoIcon} alt="HandyCFO" /></div>
      <div className="brand-name">HandyCFO</div>
    </div>
  );
}
