import { useEffect, useMemo, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import { supabase } from '../lib/supabaseClient';
import { fmtMoney } from '../lib/format';

Chart.register(...registerables);

const RANGES = [
  { key: '1', label: '1 month' },
  { key: '3', label: '3 months' },
  { key: '6', label: '6 months' },
  { key: '12', label: '12 months' },
  { key: 'custom', label: 'Custom' },
];
const CATEGORY_COLORS = ['#3FBF9C', '#E3A768', '#7FA8D9', '#C77DBE', '#D97C63', '#8FBF6A', '#B79ADB', '#5FB8B8'];

const pad = (n) => String(n).padStart(2, '0');
const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const monthKey = (y, m) => iso(y, m, 1);
const monthLabel = (key) => new Date(key + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });

function currentYM() {
  const n = new Date();
  return { y: n.getFullYear(), m: n.getMonth() };
}

// Turns the picked range into a from/to date and the list of month buckets.
function resolveRange(rangeKey, customFrom, customTo) {
  const now = currentYM();
  let start; let end;
  if (rangeKey === 'custom') {
    const [fy, fm] = customFrom.split('-').map(Number);
    const [ty, tm] = customTo.split('-').map(Number);
    start = { y: fy, m: fm - 1 };
    end = { y: ty, m: tm - 1 };
  } else {
    const n = Number(rangeKey);
    end = now;
    const total = now.y * 12 + now.m - (n - 1);
    start = { y: Math.floor(total / 12), m: total % 12 };
  }
  const months = [];
  let y = start.y; let m = start.m;
  while (y < end.y || (y === end.y && m <= end.m)) {
    months.push(monthKey(y, m));
    m += 1; if (m > 11) { m = 0; y += 1; }
  }
  const lastDay = new Date(end.y, end.m + 1, 0).getDate();
  return { months, from: iso(start.y, start.m, 1), to: iso(end.y, end.m, lastDay) };
}

export default function Reports({ business }) {
  const [rangeKey, setRangeKey] = useState('6');
  const nowYM = currentYM();
  const defaultTo = `${nowYM.y}-${pad(nowYM.m + 1)}`;
  const [customFrom, setCustomFrom] = useState(`${nowYM.y}-01`);
  const [customTo, setCustomTo] = useState(defaultTo);
  const [data, setData] = useState({ income: {}, expenses: {}, categories: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const customValid = customFrom && customTo && customFrom <= customTo && (() => {
    const [fy, fm] = customFrom.split('-').map(Number);
    const [ty, tm] = customTo.split('-').map(Number);
    return (ty * 12 + tm) - (fy * 12 + fm) < 36;
  })();

  const range = useMemo(
    () => (rangeKey === 'custom' && !customValid ? null : resolveRange(rangeKey, customFrom, customTo)),
    [rangeKey, customFrom, customTo, customValid]
  );

  useEffect(() => {
    if (!range) return undefined;
    let cancelled = false;
    setLoading(true);
    setError('');
    (async () => {
      const [inc, exp, cats] = await Promise.all([
        supabase.from('business_monthly_income').select('month, income')
          .eq('business_id', business.id).gte('month', range.from).lte('month', range.to),
        supabase.from('business_monthly_expenses').select('month, expenses')
          .eq('business_id', business.id).gte('month', range.from).lte('month', range.to),
        supabase.from('expenses').select('category, amount')
          .eq('business_id', business.id).gte('expense_date', range.from).lte('expense_date', range.to),
      ]);
      if (cancelled) return;
      if (inc.error || exp.error || cats.error) {
        setError('Could not load the report. Please try again.');
        setLoading(false);
        return;
      }
      const income = {}; const expenses = {}; const categories = {};
      (inc.data || []).forEach((r) => { income[r.month] = Number(r.income) || 0; });
      (exp.data || []).forEach((r) => { expenses[r.month] = Number(r.expenses) || 0; });
      (cats.data || []).forEach((r) => { categories[r.category] = (categories[r.category] || 0) + Number(r.amount); });
      setData({ income, expenses, categories });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [business.id, range]);

  const series = useMemo(() => {
    if (!range) return [];
    return range.months.map((m) => ({
      key: m, label: monthLabel(m), income: data.income[m] || 0, expenses: data.expenses[m] || 0,
    }));
  }, [range, data]);

  const totals = useMemo(() => {
    const income = series.reduce((s, r) => s + r.income, 0);
    const expenses = series.reduce((s, r) => s + r.expenses, 0);
    return { income, expenses, profit: income - expenses, margin: income > 0 ? ((income - expenses) / income) * 100 : null };
  }, [series]);

  const categoryRows = useMemo(
    () => Object.entries(data.categories).sort((a, b) => b[1] - a[1]),
    [data.categories]
  );

  const trendRef = useRef(null);
  const catRef = useRef(null);
  const trendChart = useRef(null);
  const catChart = useRef(null);

  useEffect(() => {
    if (!trendRef.current) return undefined;
    trendChart.current?.destroy();
    const css = getComputedStyle(document.documentElement);
    const accent = css.getPropertyValue('--accent').trim() || '#3FBF9C';
    const red = css.getPropertyValue('--red-dot').trim() || '#D97C63';
    const soft = css.getPropertyValue('--text-faint').trim() || '#888';
    const grid = css.getPropertyValue('--border').trim() || '#eee';
    trendChart.current = new Chart(trendRef.current, {
      type: 'bar',
      data: {
        labels: series.map((s) => s.label),
        datasets: [
          { label: 'Income', data: series.map((s) => s.income), backgroundColor: accent, borderRadius: 4 },
          { label: 'Expenses', data: series.map((s) => s.expenses), backgroundColor: red, borderRadius: 4 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true } } },
        scales: {
          x: { ticks: { color: soft }, grid: { display: false } },
          y: { ticks: { color: soft, callback: (v) => fmtMoney(v, business.currency).replace(/,00$/, '') }, grid: { color: grid }, beginAtZero: true },
        },
      },
    });
    return () => { trendChart.current?.destroy(); };
  }, [series, business.currency]);

  useEffect(() => {
    if (!catRef.current) return undefined;
    catChart.current?.destroy();
    if (!categoryRows.length) return undefined;
    catChart.current = new Chart(catRef.current, {
      type: 'doughnut',
      data: {
        labels: categoryRows.map(([c]) => c),
        datasets: [{ data: categoryRows.map(([, v]) => v), backgroundColor: categoryRows.map((_, i) => CATEGORY_COLORS[i % CATEGORY_COLORS.length]), borderWidth: 0 }],
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '64%', plugins: { legend: { display: false } } },
    });
    return () => { catChart.current?.destroy(); };
  }, [categoryRows]);

  const rangeLabel = rangeKey === 'custom'
    ? (range ? `${monthLabel(range.months[0])} – ${monthLabel(range.months[range.months.length - 1])}` : 'Custom range')
    : rangeKey === '1' ? 'This month' : `Last ${rangeKey} months`;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-sub">Income, spending and profit for {business.name}, calculated from your real invoices and expenses.</p>
        </div>
      </div>

      <div className="table-toolbar" style={{ padding: 0, marginBottom: 14 }}>
        <div className="filter-pills">
          {RANGES.map((r) => (
            <button key={r.key} className={`pill ${rangeKey === r.key ? 'active' : ''}`} onClick={() => setRangeKey(r.key)}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {rangeKey === 'custom' && (
        <div className="panel" style={{ padding: 16, marginBottom: 14 }}>
          <div className="field-row">
            <div className="field" style={{ marginBottom: 0 }}>
              <label>From</label>
              <input type="month" value={customFrom} max={customTo} onChange={(e) => setCustomFrom(e.target.value)} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>To</label>
              <input type="month" value={customTo} min={customFrom} max={defaultTo} onChange={(e) => setCustomTo(e.target.value)} />
            </div>
          </div>
          {!customValid && (
            <p style={{ color: 'var(--red)', fontSize: 12.5, margin: '10px 0 0' }}>
              Pick a start month on or before the end month, up to 36 months apart.
            </p>
          )}
        </div>
      )}

      {error && <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>}

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label"><span className="metric-dot" style={{ background: 'var(--accent)' }} />Income</div>
          <div className="metric-value">{fmtMoney(totals.income, business.currency)}</div>
          <div className="metric-delta">{rangeLabel} · paid invoices</div>
        </div>
        <div className="metric-card">
          <div className="metric-label"><span className="metric-dot" style={{ background: 'var(--red-dot)' }} />Expenses</div>
          <div className="metric-value">{fmtMoney(totals.expenses, business.currency)}</div>
          <div className="metric-delta">{rangeLabel}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label"><span className="metric-dot" style={{ background: 'var(--amber-dot)' }} />Profit</div>
          <div className="metric-value" style={{ color: totals.profit < 0 ? 'var(--red)' : undefined }}>{fmtMoney(totals.profit, business.currency)}</div>
          <div className="metric-delta">
            {totals.margin == null ? 'No income in this period' : `${totals.margin.toFixed(0)}% margin`}
          </div>
        </div>
      </div>

      <div className="two-col">
        <div className="panel" style={{ padding: 18 }}>
          <div className="section-title">Income vs. expenses</div>
          <div className="chart-box"><canvas ref={trendRef} /></div>
        </div>
        <div className="panel" style={{ padding: 18 }}>
          <div className="section-title">Where the money went</div>
          {categoryRows.length === 0 ? (
            <div className="empty-hint">{loading ? 'Loading…' : 'No expenses in this period.'}</div>
          ) : (
            <>
              <div className="chart-box small"><canvas ref={catRef} /></div>
              <div className="category-legend">
                {categoryRows.map(([c, v], i) => (
                  <div className="category-legend-item" key={c}>
                    <span className="category-legend-dot" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                    {c} · {fmtMoney(v, business.currency)}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
