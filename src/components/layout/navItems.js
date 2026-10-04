// Centralized so the sidebar (desktop + mobile drawer) and the
// mobile footer bar can't drift out of sync with each other.
export const NAV_ITEMS = [
  { view: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { view: 'inbox', label: 'Financial Inbox', icon: 'inbox', badgeKey: 'inbox' },
  { view: 'invoices', label: 'Invoices', icon: 'invoice' },
  { view: 'expenses', label: 'Expenses', icon: 'expense' },
  { view: 'reports', label: 'Reports', icon: 'chart' },
  { view: 'messages', label: 'Messages', icon: 'message', badgeKey: 'messages' },
  { view: 'network', label: 'Network', icon: 'network' },
  { view: 'settings', label: 'Settings', icon: 'settings' },
];

// The mobile footer only has room for a few — the rest live behind "More".
export const FOOTER_VIEWS = ['dashboard', 'inbox', 'invoices', 'messages'];
