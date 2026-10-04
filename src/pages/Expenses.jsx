import { useMemo, useState } from 'react';
import { useExpenses } from '../hooks/useExpenses';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Icon from '../components/layout/Icon';
import { api } from '../lib/api';

const DEFAULT_CATEGORIES = ['Software', 'Travel', 'Office', 'Meals', 'Marketing', 'Materials', 'Shipping', 'Other'];

function fmtMoney(amount, currency = 'EUR') {
  return new Intl.NumberFormat('de-AT', { style: 'currency', currency }).format(Number(amount) || 0);
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function Expenses({ business }) {
  const { expenses, loading, createExpense, deleteExpense } = useExpenses(business.id);
  const [filter, setFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  // Filter pills come from the categories actually present, so a new
  // business doesn't show empty pills for things it never spent on.
  const categories = useMemo(() => [...new Set(expenses.map((e) => e.category))], [expenses]);
  const rows = useMemo(
    () => expenses.filter((e) => filter === 'all' || e.category === filter),
    [expenses, filter]
  );

  async function openReceipt(e) {
    setError('');
    try {
      const { url } = await api.expenseReceiptLink(e.id);
      window.open(url, '_blank', 'noopener');
    } catch (err) {
      setError(err.message || 'Could not open the receipt');
    }
  }

  async function handleConfirmDelete() {
    setDeleting(true);
    setError('');
    try {
      await deleteExpense(toDelete.id);
      setToDelete(null);
      if (filter !== 'all' && !expenses.some((e) => e.id !== toDelete.id && e.category === filter)) setFilter('all');
    } catch (err) {
      setError(err.message || 'Could not delete the expense');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-sub">Money going out. Everything you have spent on the business. Add one by hand, or scan a receipt in the Financial Inbox.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Icon name="plus" size={15} strokeWidth={2} />
          Add expense
        </button>
      </div>

      {error && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 0 }}>{error}</p>}

      <div className="panel">
        <div className="table-toolbar">
          <div className="filter-pills">
            <button className={`pill ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
              All categories
            </button>
            {categories.map((c) => (
              <button key={c} className={`pill ${filter === c ? 'active' : ''}`} onClick={() => setFilter(c)}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Merchant</th>
                <th>Category</th>
                <th className="amt">Amount</th>
                <th>Bank match</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} className="empty-hint">Loading…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-hint">
                    {expenses.length === 0
                      ? 'No expenses yet. Add one here, or scan a receipt in the Financial Inbox.'
                      : 'No expenses in this category.'}
                  </td>
                </tr>
              )}
              {!loading && rows.map((e) => (
                <tr key={e.id}>
                  <td className="cell-soft">{fmtDate(e.expense_date)}</td>
                  <td className="cell-primary">
                    {e.merchant}
                    {Number(e.vat_amount) > 0 && (
                      <div className="cell-soft" style={{ fontSize: 11.5, fontWeight: 400 }}>
                        incl. {fmtMoney(e.vat_amount, e.currency)} VAT
                      </div>
                    )}
                  </td>
                  <td><span className="badge gray"><span className="dot" />{e.category}</span></td>
                  <td className="amt cell-primary">{fmtMoney(e.amount, e.currency)}</td>
                  <td>
                    {e.bank_matched ? (
                      <span className="match-chip">
                        <Icon name="check" size={11} strokeWidth={3} />
                        Matched to bank
                      </span>
                    ) : (
                      <span className="unmatched-chip">Awaiting match</span>
                    )}
                  </td>
                  <td>
                    <div className="row-actions">
                      {e.receipt_provider !== 'none' && e.receipt_external_id && (
                        <button className="icon-btn" title="View receipt" onClick={() => openReceipt(e)}>
                          <Icon name="eye" size={14} strokeWidth={2} />
                        </button>
                      )}
                      <button className="icon-btn" title="Delete expense" onClick={() => setToDelete(e)}>
                        <Icon name="trash" size={14} strokeWidth={2} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <CreateExpenseModal
          categories={[...new Set([...DEFAULT_CATEGORIES, ...categories])]}
          onClose={() => setShowCreate(false)}
          onCreate={async (fields) => {
            await createExpense(fields);
            setShowCreate(false);
          }}
        />
      )}

      {toDelete && (
        <ConfirmModal
          title="Delete expense?"
          message={`Delete the ${fmtMoney(toDelete.amount, toDelete.currency)} expense from ${toDelete.merchant}? This can't be undone.`}
          busy={deleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}

function CreateExpenseModal({ categories, onClose, onCreate }) {
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState('');
  const [vat, setVat] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setError('');
    const parsedAmount = parseFloat(String(amount).replace(',', '.'));
    const parsedVat = vat.trim() === '' ? 0 : parseFloat(String(vat).replace(',', '.'));
    if (!merchant.trim()) return setError('Add a merchant name.');
    if (Number.isNaN(parsedAmount) || parsedAmount < 0) return setError('Enter a valid amount.');
    if (Number.isNaN(parsedVat) || parsedVat < 0) return setError('Enter a valid VAT amount, or leave it empty.');
    if (parsedVat > parsedAmount) return setError('VAT can not be more than the total amount.');

    setBusy(true);
    try {
      await onCreate({
        merchant: merchant.trim(),
        category,
        amount: parsedAmount,
        vat_amount: parsedVat,
        expense_date: date,
      });
    } catch (err) {
      setError(err.message || 'Could not save the expense');
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Add expense"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={busy}>
            {busy ? 'Saving…' : 'Save expense'}
          </button>
        </>
      }
    >
      <div className="field">
        <label>Merchant</label>
        <input type="text" autoFocus placeholder="e.g. Figma Inc." value={merchant} onChange={(e) => setMerchant(e.target.value)} />
      </div>
      <div className="field-row">
        <div className="field">
          <label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label>Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="field-row">
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Amount (€, total paid)</label>
          <input type="text" inputMode="decimal" placeholder="45.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>VAT included (€)</label>
          <input type="text" inputMode="decimal" placeholder="7.50" value={vat} onChange={(e) => setVat(e.target.value)} />
        </div>
      </div>
      {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 0 }}>{error}</p>}
    </Modal>
  );
}
