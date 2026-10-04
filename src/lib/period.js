// One definition of "the period the user is looking at", shared by the
// Dashboard and Reports so both always agree.

const pad = (n) => String(n).padStart(2, '0');
const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

export const PERIODS = [
  { key: '1', label: '1 month' },
  { key: '3', label: '3 months' },
  { key: '6', label: '6 months' },
  { key: 'lastyear', label: 'Last year' },
  { key: 'year', label: 'Year' },
  { key: 'custom', label: 'Custom' },
];

export function yearOptions() {
  const now = new Date().getFullYear();
  return Array.from({ length: 10 }, (_, i) => now - i);
}

export function defaultPeriod() {
  const now = new Date();
  const today = iso(now.getFullYear(), now.getMonth(), now.getDate());
  return { key: '1', year: now.getFullYear(), from: iso(now.getFullYear(), now.getMonth(), 1), to: today };
}

export function isPeriodValid(p) {
  if (p.key !== 'custom') return true;
  if (!p.from || !p.to || p.from > p.to) return false;
  // Keep custom ranges to a sensible size so queries stay fast.
  const days = (new Date(p.to) - new Date(p.from)) / 86400000;
  return days <= 366 * 5;
}

// Returns { from, to, label } with inclusive YYYY-MM-DD dates.
export function resolvePeriod(p) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const today = iso(y, m, now.getDate());

  if (p.key === 'custom') {
    return { from: p.from, to: p.to, label: `${fmt(p.from)} – ${fmt(p.to)}` };
  }
  if (p.key === 'lastyear') {
    return { from: iso(y - 1, 0, 1), to: iso(y - 1, 11, 31), label: String(y - 1) };
  }
  if (p.key === 'year') {
    const yr = Number(p.year) || y;
    return { from: iso(yr, 0, 1), to: yr === y ? today : iso(yr, 11, 31), label: String(yr) };
  }
  const n = Number(p.key);
  const total = y * 12 + m - (n - 1);
  const start = iso(Math.floor(total / 12), total % 12, 1);
  return { from: start, to: today, label: n === 1 ? 'This month' : `Last ${n} months` };
}

export function inPeriod(dateStr, range) {
  if (!dateStr) return false;
  const d = String(dateStr).slice(0, 10);
  return d >= range.from && d <= range.to;
}

function fmt(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
