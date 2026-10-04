import { useState } from 'react';
import Icon from './Icon';
import { NAV_ITEMS } from './navItems';
import logoIcon from '../../assets/logo-icon.png';

export default function Sidebar({
  open,
  onClose,
  currentView,
  onNavigate,
  businesses,
  currentBusinessId,
  onSwitchBusiness,
  onAddBusiness,
  onDeleteBusiness,
  badgeCounts = {},
  userEmail,
  onSignOut,
}) {
  const [bizMenuOpen, setBizMenuOpen] = useState(false);
  const currentBusiness = businesses.find((b) => b.id === currentBusinessId);

  return (
    <>
      <div className={`sidebar-scrim ${open ? 'open' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><img src={logoIcon} alt="HandyCFO" /></div>
          <div>
            <div className="brand-name">HandyCFO</div>
            <div className="brand-sub">My smart accountant</div>
          </div>
        </div>

        <div className={`biz-switcher ${bizMenuOpen ? 'open' : ''}`}>
          <button className="biz-switcher-btn" onClick={() => setBizMenuOpen((v) => !v)}>
            <div className="biz-avatar" style={{ background: currentBusiness?.color || '#3FBF9C' }}>
              {currentBusiness?.short_code || '??'}
            </div>
            <div className="biz-switcher-label">
              <div className="biz-switcher-name">{currentBusiness?.name || 'Select business'}</div>
              <div className="biz-switcher-type">{currentBusiness?.business_type}</div>
            </div>
            <Icon name="chevronDown" size={14} strokeWidth={2} />
          </button>
          {bizMenuOpen && (
            <div className="biz-menu">
              {businesses.map((b) => (
                <button key={b.id} className="biz-menu-item" onClick={() => { onSwitchBusiness(b.id); setBizMenuOpen(false); }}>
                  <div className="biz-avatar" style={{ background: b.color }}>{b.short_code}</div>
                  <div>
                    <div className="biz-menu-item-name">{b.name}</div>
                    <div className="biz-menu-item-type">{b.business_type}</div>
                  </div>
                  {b.id === currentBusinessId && <Icon name="check" size={15} strokeWidth={2.5} />}
                  {businesses.length > 1 && (
                    <button
                      className="biz-menu-item-delete"
                      title="Delete business"
                      onClick={(e) => { e.stopPropagation(); onDeleteBusiness(b); }}
                    >
                      <Icon name="trash" size={13} />
                    </button>
                  )}
                </button>
              ))}
              <div className="biz-menu-divider" />
              <button
                className="biz-menu-item biz-menu-add"
                onClick={() => { setBizMenuOpen(false); onAddBusiness(); }}
              >
                <Icon name="plus" size={15} strokeWidth={2} />
                Add a business
              </button>
            </div>
          )}
        </div>

        <nav className="nav-group">
          {NAV_ITEMS.map((item) => {
            const count = badgeCounts[item.badgeKey];
            return (
              <button
                key={item.view}
                className={`nav-item ${currentView === item.view ? 'active' : ''}`}
                onClick={() => onNavigate(item.view)}
              >
                <Icon name={item.icon} />
                {item.label}
                {!!count && <span className="nav-badge">{count}</span>}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="user-avatar">{(userEmail || '?').slice(0, 2).toUpperCase()}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userEmail}
              </div>
              <button
                onClick={onSignOut}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--sidebar-text-dim)', fontSize: 11.5 }}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
