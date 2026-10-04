import { useMemo } from 'react';
import { useInvoices } from '../hooks/useInvoices';
import { useExpenses } from '../hooks/useExpenses';

function fmtEUR(n) {
  return new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' }).format(n || 0);
}

function isThisMonth(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth();
}

export default function Dashboard({ business, userEmail }) {
  const { invoices, loading: invoicesLoading } = useInvoices(business.id);
  const { expenses, loading: expensesLoading } = useExpenses(business.id);

  const stats = useMemo(() => {
    const revenue = invoices
      .filter((inv) => inv.status === 'Paid' && isThisMonth(inv.paid_at || inv.issue_date))
      .reduce((sum, inv) => sum + Number(inv.amount), 0);

    const expensesThisMonth = expenses
      .filter((e) => isThisMonth(e.expense_date))
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const outstanding = invoices
      .filter((inv) => inv.status === 'Sent' || inv.status === 'Overdue')
      .reduce((sum, inv) => sum + Number(inv.amount), 0);

    const overdueInvoices = invoices.filter((inv) => inv.status === 'Overdue');
    const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);

    return { revenue, expensesThisMonth, outstanding, overdueInvoices, overdueAmount };
  }, [invoices, expenses]);

  const firstName = (userEmail || '').split('@')[0];
  const loading = invoicesLoading || expensesLoading;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Good morning, {firstName || 'there'} 👋</h1>
          <p className="page-sub">Here's where {business.name}'s money stands right now.</p>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-faint)' }}>Loading…</p>
      ) : (
        <>
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-label"><span className="metric-dot" style={{ background: 'var(--accent)' }} />Revenue this month</div>
              <div className="metric-value">{fmtEUR(stats.revenue)}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label"><span className="metric-dot" style={{ background: 'var(--red-dot)' }} />Expenses this month</div>
              <div className="metric-value">{fmtEUR(stats.expensesThisMonth)}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label"><span className="metric-dot" style={{ background: 'var(--amber-dot)' }} />Outstanding owed to you</div>
              <div className="metric-value">{fmtEUR(stats.outstanding)}</div>
              <div className="metric-delta">
                Across {invoices.filter((i) => i.status === 'Sent' || i.status === 'Overdue').length} invoice(s)
              </div>
            </div>
          </div>

          {stats.overdueInvoices.length > 0 && (
            <div className="alert-row">
              <div className="alert-item">
                <div className="alert-icon red">⚠️</div>
                <div>
                  <strong>{stats.overdueInvoices.length} invoice{stats.overdueInvoices.length === 1 ? '' : 's'} overdue</strong>
                  {' '}· {fmtEUR(stats.overdueAmount)} needs following up
                </div>
              </div>
            </div>
          )}

          {invoices.length === 0 && expenses.length === 0 && (
            <div className="panel" style={{ padding: 32, textAlign: 'center', color: 'var(--text-faint)' }}>
              Nothing recorded yet for {business.name}. Create your first invoice or scan a receipt to get started.
            </div>
          )}
        </>
      )}
    </div>
  );
}
