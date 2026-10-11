import { useEffect, useMemo, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import PeriodPicker from '../components/PeriodPicker';
import { defaultPeriod, resolvePeriod, inPeriod, isPeriodValid } from '../lib/period';
import { useInvoices } from '../hooks/useInvoices';
import { useExpenses } from '../hooks/useExpenses';
import { useT } from '../lib/i18n';

Chart.register(...registerables);

const DAY = 86400000;
const toISO = (d) => d.toISOString().slice(0, 10);
const parse = (s) => new Date(`${s}T00:00:00Z`);

// The window to compare against: same days of the previous month for
// "This month", otherwise an equal-length window right before the range.
function previousRange(range, isMonth) {
  const from = parse(range.from);
  const to = parse(range.to);
  if (isMonth) {
    const pf = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() - 1, 1));
    const lastDay = new Date(Date.UTC(pf.getUTCFullYear(), pf.getUTCMonth() + 1, 0)).getUTCDate();
    const pt = new Date(Date.UTC(pf.getUTCFullYear(), pf.getUTCMonth(), Math.min(to.getUTCDate(), lastDay)));
    return { from: toISO(pf), to: toISO(pt) };
  }
  const len = Math.round((to - from) / DAY) + 1;
  return { from: toISO(new Date(from.getTime() - len * DAY)), to: toISO(new Date(from.getTime() - DAY)) };
}

function pctChange(cur, prev) {
  if (!prev) return null;
  return ((cur - prev) / Math.abs(prev)) * 100;
}

function monthKeys(range) {
  const f = parse(range.from);
  const e = parse(range.to);
  let n = (e.getUTCFullYear() - f.getUTCFullYear()) * 12 + e.getUTCMonth() - f.getUTCMonth() + 1;
  if (n < 3) n = 6;
  n = Math.min(n, 12);
  const keys = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth() - i, 1));
    keys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

function Delta({ value, goodWhenUp = true, t }) {
  if (value == null) return <span className="metric-delta">{t('No earlier data to compare')}</span>;
  const up = value >= 0;
  const good = up === goodWhenUp;
  const cls = Math.abs(value) < 0.5 ? '' : good ? 'up' : 'down';
  return (
    <span className={`metric-delta ${cls}`}>
      {up ? '▲' : '▼'} {t('{pct}% vs previous period', { pct: Math.abs(value).toFixed(0) })}
    </span>
  );
}

function fmtEUR(n, currency = 'EUR') {
  return new Intl.NumberFormat('de-AT', { style: 'currency', currency }).format(n || 0);
}

export default function Dashboard({ business, userEmail }) {
  const { t } = useT();
  const { invoices, loading: invoicesLoading } = useInvoices(business.id);
  const { expenses, loading: expensesLoading } = useExpenses(business.id);

  const [period, setPeriod] = useState(defaultPeriod);
  const periodValid = isPeriodValid(period);
  const range = useMemo(() => resolvePeriod(periodValid ? period : defaultPeriod()), [period, periodValid]);

  const stats = useMemo(() => {
    const revenue = invoices
      .filter((inv) => inv.status === 'Paid' && inPeriod(inv.paid_at || inv.issue_date, range))
      .reduce((sum, inv) => sum + Number(inv.amount), 0);

    const expensesInPeriod = expenses
      .filter((e) => inPeriod(e.expense_date, range))
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const outstanding = invoices
      .filter((inv) => inv.status === 'Sent' || inv.status === 'Overdue')
      .reduce((sum, inv) => sum + Number(inv.amount), 0);

    const overdueInvoices = invoices.filter((inv) => inv.status === 'Overdue');
    const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);

    const prev = previousRange(range, period.key === '1');
    const sumPaid = (r) => invoices.filter((inv) => inv.status === 'Paid' && inPeriod(inv.paid_at || inv.issue_date, r)).reduce((a, inv) => a + Number(inv.amount), 0);
    const sumExp = (r) => expenses.filter((e) => inPeriod(e.expense_date, r)).reduce((a, e) => a + Number(e.amount), 0);
    const prevRevenue = sumPaid(prev);
    const prevExpenses = sumExp(prev);
    const prevProfit = prevRevenue - prevExpenses;
    const profit = revenue - expensesInPeriod;

    // Invoices issued in the period, grouped by what state they are in now.
    const today = new Date().toISOString().slice(0, 10);
    const mix = { Paid: 0, Pending: 0, Overdue: 0, Draft: 0 };
    invoices.filter((inv) => inPeriod(inv.issue_date, range)).forEach((inv) => {
      const amt = Number(inv.amount) || 0;
      if (inv.status === 'Paid') mix.Paid += amt;
      else if (inv.status === 'Draft') mix.Draft += amt;
      else if (inv.status === 'Overdue' || (inv.status === 'Sent' && inv.due_date && String(inv.due_date).slice(0, 10) < today)) mix.Overdue += amt;
      else mix.Pending += amt;
    });
    const mixTotal = Object.values(mix).reduce((a, b) => a + b, 0);

    const catMap = {};
    expenses.filter((e) => inPeriod(e.expense_date, range)).forEach((e) => {
      const c = e.category || 'Other';
      catMap[c] = (catMap[c] || 0) + Number(e.amount);
    });
    const catSorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    const top = catSorted.slice(0, 5);
    const rest = catSorted.slice(5).reduce((a, [, v]) => a + v, 0);
    if (rest > 0) top.push(['Other', rest]);

    return {
      revenue, expensesInPeriod, profit, outstanding, overdueInvoices, overdueAmount,
      revenueChange: pctChange(revenue, prevRevenue),
      expensesChange: pctChange(expensesInPeriod, prevExpenses),
      profitChange: prevProfit > 0 ? pctChange(profit, prevProfit) : null,
      margin: revenue > 0 ? (profit / revenue) * 100 : null,
      mix, mixTotal, categories: top,
    };
  }, [invoices, expenses, range, period.key]);

  const months = useMemo(() => {
    const keys = monthKeys(range);
    const rows = keys.map((k) => ({ key: k, income: 0, expenses: 0 }));
    const idx = Object.fromEntries(rows.map((r, i) => [r.key, i]));
    invoices.filter((inv) => inv.status === 'Paid').forEach((inv) => {
      const k = String(inv.paid_at || inv.issue_date || '').slice(0, 7);
      if (k in idx) rows[idx[k]].income += Number(inv.amount) || 0;
    });
    expenses.forEach((e) => {
      const k = String(e.expense_date || '').slice(0, 7);
      if (k in idx) rows[idx[k]].expenses += Number(e.amount) || 0;
    });
    return rows.map((r) => ({
      ...r,
      label: new Date(`${r.key}-01T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' }),
    }));
  }, [invoices, expenses, range]);

  const trendRef = useRef(null);
  const trendChart = useRef(null);
  const loadingNow = invoicesLoading || expensesLoading;
  useEffect(() => {
    if (loadingNow || !trendRef.current) return undefined;
    trendChart.current?.destroy();
    const css = getComputedStyle(document.documentElement);
    const accent = css.getPropertyValue('--accent').trim() || '#3FBF9C';
    const red = css.getPropertyValue('--red-dot').trim() || '#D97C63';
    const soft = css.getPropertyValue('--text-faint').trim() || '#888';
    const grid = css.getPropertyValue('--border').trim() || '#eee';
    const money = (v) => fmtEUR(v, business.currency).replace(/,00$/, '');
    trendChart.current = new Chart(trendRef.current, {
      type: 'bar',
      data: {
        labels: months.map((m) => m.label),
        datasets: [
          { label: t('Income'), data: months.map((m) => m.income), backgroundColor: accent, borderRadius: 4, maxBarThickness: 22 },
          { label: t('Expenses'), data: months.map((m) => m.expenses), backgroundColor: red, borderRadius: 4, maxBarThickness: 22 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true } },
          tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${money(c.parsed.y)}` } },
        },
        scales: {
          x: { ticks: { color: soft }, grid: { display: false } },
          y: { ticks: { color: soft, callback: (v) => money(v) }, grid: { color: grid }, beginAtZero: true },
        },
      },
    });
    return () => { trendChart.current?.destroy(); };
  }, [months, business.currency, t, loadingNow]);

  const firstName = (userEmail || '').split('@')[0];
  const loading = invoicesLoading || expensesLoading;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">{t('Good morning, {name} 👋', { name: firstName || t('there') })}</h1>
          <p className="page-sub">{t("Here's where {name}'s money stands right now.", { name: business.name })}</p>
        </div>
      </div>

      <PeriodPicker value={period} onChange={setPeriod} />
      {!periodValid && (
        <p style={{ color: 'var(--red)', fontSize: 12.5, marginTop: -6 }}>
          {t('Pick a start date on or before the end date. Showing this month meanwhile.')}
        </p>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-faint)' }}>{t('Loading…')}</p>
      ) : (
        <>
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-label"><span className="metric-dot" style={{ background: 'var(--accent)' }} />{t('Revenue')}</div>
              <div className="metric-value">{fmtEUR(stats.revenue, business.currency)}</div>
              <div className="metric-delta">{t('{period} · paid invoices', { period: t(range.label) })}</div>
              <Delta value={stats.revenueChange} t={t} />
            </div>
            <div className="metric-card">
              <div className="metric-label"><span className="metric-dot" style={{ background: 'var(--red-dot)' }} />{t('Expenses')}</div>
              <div className="metric-value">{fmtEUR(stats.expensesInPeriod, business.currency)}</div>
              <div className="metric-delta">{t(range.label)}</div>
              <Delta value={stats.expensesChange} goodWhenUp={false} t={t} />
            </div>
            <div className="metric-card">
              <div className="metric-label"><span className="metric-dot" style={{ background: 'var(--green-dot)' }} />{t('Profit')}</div>
              <div className="metric-value" style={{ color: stats.profit < 0 ? 'var(--red)' : undefined }}>{fmtEUR(stats.profit, business.currency)}</div>
              <div className="metric-delta">
                {stats.margin == null ? t('No income in this period') : t('{margin}% margin', { margin: stats.margin.toFixed(0) })}
              </div>
              <Delta value={stats.profitChange} t={t} />
            </div>
            <div className="metric-card">
              <div className="metric-label"><span className="metric-dot" style={{ background: 'var(--amber-dot)' }} />{t('Outstanding owed to you')}</div>
              <div className="metric-value">{fmtEUR(stats.outstanding, business.currency)}</div>
              <div className="metric-delta">
                {t('Right now · across {count} invoice(s)', { count: invoices.filter((i) => i.status === 'Sent' || i.status === 'Overdue').length })}
              </div>
            </div>
          </div>

          {stats.overdueInvoices.length > 0 && (
            <div className="alert-row">
              <div className="alert-item">
                <div className="alert-icon red">⚠️</div>
                <div>
                  <strong>{stats.overdueInvoices.length === 1 ? t('{count} invoice overdue', { count: 1 }) : t('{count} invoices overdue', { count: stats.overdueInvoices.length })}</strong>
                  {' '}· {t('{amount} needs following up', { amount: fmtEUR(stats.overdueAmount, business.currency) })}
                </div>
              </div>
            </div>
          )}


          <div className="two-col dash-charts">
            <div className="panel">
              <div className="section-title">{t('Income vs. expenses')}</div>
              <div className="chart-box"><canvas ref={trendRef} /></div>
            </div>
            <div className="panel">
              <div className="section-title">{t('Where the money went')}</div>
              {stats.categories.length === 0 ? (
                <p style={{ color: 'var(--text-faint)', fontSize: 13 }}>{t('No expenses in this period.')}</p>
              ) : (
                <div className="hbars">
                  {stats.categories.map(([name, value]) => {
                    const pct = stats.expensesInPeriod > 0 ? (value / stats.expensesInPeriod) * 100 : 0;
                    return (
                      <div className="hbar" key={name}>
                        <div className="hbar-head">
                          <span>{t(name)}</span>
                          <span><strong>{pct.toFixed(0)}%</strong> · {fmtEUR(value, business.currency)}</span>
                        </div>
                        <div className="hbar-track"><div className="hbar-fill" style={{ width: `${Math.max(pct, 2)}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {stats.mixTotal > 0 && (
            <div className="panel">
              <div className="section-title">{t('Invoices by status')}</div>
              <div className="statusbar" role="img" aria-label={t('Invoices by status')}>
                {[['Paid', 'var(--green-dot)'], ['Pending', 'var(--amber-dot)'], ['Overdue', 'var(--red-dot)'], ['Draft', 'var(--text-faint)']]
                  .filter(([k]) => stats.mix[k] > 0)
                  .map(([k, color]) => (
                    <div key={k} style={{ width: `${(stats.mix[k] / stats.mixTotal) * 100}%`, background: color }} title={`${t(k)}: ${fmtEUR(stats.mix[k], business.currency)}`} />
                  ))}
              </div>
              <div className="status-legend">
                {[['Paid', 'var(--green-dot)'], ['Pending', 'var(--amber-dot)'], ['Overdue', 'var(--red-dot)'], ['Draft', 'var(--text-faint)']].map(([k, color]) => (
                  <div className="status-legend-item" key={k}>
                    <span className="category-legend-dot" style={{ background: color }} />
                    <span>{t(k)}</span>
                    <strong>{((stats.mix[k] / stats.mixTotal) * 100).toFixed(0)}%</strong>
                    <span className="status-amt">{fmtEUR(stats.mix[k], business.currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {invoices.length === 0 && expenses.length === 0 && (
            <div className="panel" style={{ padding: 32, textAlign: 'center', color: 'var(--text-faint)' }}>
              {t('Nothing recorded yet for {name}. Create your first invoice or scan a receipt to get started.', { name: business.name })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
