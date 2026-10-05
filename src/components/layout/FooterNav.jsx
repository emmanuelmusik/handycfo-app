import Icon from './Icon';
import { useT } from '../../lib/i18n';
import { NAV_ITEMS, FOOTER_VIEWS } from './navItems';

export default function FooterNav({ currentView, onNavigate, onOpenSidebar, badgeCounts = {} }) {
  const { t } = useT();
  const footerItems = NAV_ITEMS.filter((i) => FOOTER_VIEWS.includes(i.view));
  const isOnMoreView = !FOOTER_VIEWS.includes(currentView);

  return (
    <nav className="footer-nav">
      {footerItems.map((item) => {
        const count = badgeCounts[item.badgeKey];
        return (
          <button
            key={item.view}
            className={`footer-nav-item ${currentView === item.view ? 'active' : ''}`}
            onClick={() => onNavigate(item.view)}
          >
            <Icon name={item.icon} size={21} />
            {t(item.label === 'Financial Inbox' ? 'Inbox' : item.label)}
            {!!count && <span className="footer-badge">{count}</span>}
          </button>
        );
      })}
      <button className={`footer-nav-item ${isOnMoreView ? 'active' : ''}`} onClick={onOpenSidebar}>
        <Icon name="more" size={21} />
        {t('More')}
      </button>
    </nav>
  );
}
