import { useMemo, useState } from 'react';
import PeriodPicker from '../components/PeriodPicker';
import { defaultPeriod, resolvePeriod, inPeriod, isPeriodValid } from '../lib/period';
import { useInvoices } from '../hooks/useInvoices';
import { useExpenses } from '../hooks/useExpenses';
import { useT } from '../lib/i18n';

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

    return { revenue, expensesInPeriod, profit: revenue - expensesInPeriod, outstanding, overdueInvoices, overdueAmount };
  }, [invoices, expenses, range]);

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
            </div>
            <div className="metric-card">
              <div className="metric-label"><span className="metric-dot" style={{ background: 'var(--red-dot)' }} />{t('Expenses')}</div>
              <div className="metric-value">{fmtEUR(stats.expensesInPeriod, business.currency)}</div>
              <div className="metric-delta">{t(range.label)}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label"><span className="metric-dot" style={{ background: 'var(--green-dot)' }} />{t('Profit')}</div>
              <div className="metric-value" style={{ color: stats.profit < 0 ? 'var(--red)' : undefined }}>{fmtEUR(stats.profit, business.currency)}</div>
              <div className="metric-delta">{t(range.label)}</div>
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
