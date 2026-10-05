import { useMemo, useRef, useState } from 'react';
import { useExpenses } from '../hooks/useExpenses';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Icon from '../components/layout/Icon';
import { api } from '../lib/api';
import { prepareUpload } from '../lib/image';
import { findDuplicateExpense } from '../lib/duplicates';
import { ReviewModal } from './Inbox';
import { useT } from '../lib/i18n';

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
  const { t } = useT();
  const { expenses, loading, refetch, createExpense, deleteExpense } = useExpenses(business.id);
  const fileInput = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [queue, setQueue] = useState([]); // scanned receipts waiting for a check, one at a time
  const [queueTotal, setQueueTotal] = useState(0);
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

  async function handleScanFiles(fileList) {
    const files = Array.from(fileList || []).slice(0, 10);
    if (!files.length) return;
    setError('');
    setScanning(true);
    const found = [];
    const failed = [];
    for (const file of files) {
      try {
        const prepared = await prepareUpload(file);
        const { documents } = await api.scanReceipt({ businessId: business.id, ...prepared });
        found.push(...documents);
      } catch (err) {
        failed.push(t('{name}: {message}', { name: file.name, message: err.message || t('could not be read') }));
      }
    }
    setScanning(false);
    if (failed.length) setError(failed.join(' '));
    if (found.length) { setQueue(found); setQueueTotal(found.length); } // straight to the check screen
  }

  async function openReceipt(e) {
    setError('');
    try {
      const { url } = await api.expenseReceiptLink(e.id);
      window.open(url, '_blank', 'noopener');
    } catch (err) {
      setError(err.message || t('Could not open the receipt'));
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
      setError(err.message || t('Could not delete the expense'));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">{t('Expenses')}</h1>
          <p className="page-sub">{t('Money going out. Everything you have spent on the business. Add one by hand, or scan a receipt in the Financial Inbox.')}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => fileInput.current?.click()} disabled={scanning}>
            <Icon name="camera" size={15} strokeWidth={2} />
            {scanning ? t('Reading receipt…') : t('Scan receipt')}
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Icon name="plus" size={15} strokeWidth={2} />
            {t('Add expense')}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*,application/pdf"
            multiple
            hidden
            onClick={(e) => { e.target.value = ''; }}
            onChange={(e) => handleScanFiles(e.target.files)}
          />
        </div>
      </div>

      {error && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 0 }}>{error}</p>}

      <div className="panel">
        <div className="table-toolbar">
          <div className="filter-pills">
            <button className={`pill ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
              {t('All categories')}
            </button>
            {categories.map((c) => (
              <button key={c} className={`pill ${filter === c ? 'active' : ''}`} onClick={() => setFilter(c)}>
                {t(c)}
              </button>
            ))}
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('Date')}</th>
                <th>{t('Merchant')}</th>
                <th>{t('Category')}</th>
                <th className="amt">{t('Amount')}</th>
                <th>{t('Bank match')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} className="empty-hint">{t('Loading…')}</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-hint">
                    {expenses.length === 0
                      ? t('No expenses yet. Add one here, or scan a receipt in the Financial Inbox.')
                      : t('No expenses in this category.')}
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
                        {t('incl. {amount} VAT', { amount: fmtMoney(e.vat_amount, e.currency) })}
                      </div>
                    )}
                  </td>
                  <td><span className="badge gray"><span className="dot" />{t(e.category)}</span></td>
                  <td className="amt cell-primary">{fmtMoney(e.amount, e.currency)}</td>
                  <td>
                    {e.bank_matched ? (
                      <span className="match-chip">
                        <Icon name="check" size={11} strokeWidth={3} />
                        {t('Matched to bank')}
                      </span>
                    ) : (
                      <span className="unmatched-chip">{t('Awaiting match')}</span>
                    )}
                  </td>
                  <td>
                    <div className="row-actions">
                      {e.receipt_provider !== 'none' && e.receipt_external_id && (
                        <button className="icon-btn" title={t('View receipt')} onClick={() => openReceipt(e)}>
                          <Icon name="eye" size={14} strokeWidth={2} />
                        </button>
                      )}
                      <button className="icon-btn" title={t('Delete expense')} onClick={() => setToDelete(e)}>
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

      {queue.length > 0 && (
        <ReviewModal
          key={queue[0].id}
          doc={queue[0]}
          business={business}
          title={queueTotal > 1 ? t('Review receipt {current} of {total}', { current: queueTotal - queue.length + 1, total: queueTotal }) : t('Review receipt')}
          onClose={() => setQueue([])}
          onDone={async () => { setQueue((q) => q.slice(1)); await refetch(); }}
        />
      )}

      {showCreate && (
        <CreateExpenseModal
          categories={[...new Set([...DEFAULT_CATEGORIES, ...categories])]}
          onClose={() => setShowCreate(false)}
          onCreate={async (fields) => {
            const same = findDuplicateExpense(expenses, fields);
            if (same && !window.confirm(t('You already have an expense from {merchant} for {amount} on {date}. Add this one anyway?', { merchant: same.merchant, amount: fmtMoney(same.amount, same.currency), date: fmtDate(same.expense_date) }))) {
              return;
            }
            await createExpense(fields);
            setShowCreate(false);
          }}
        />
      )}

      {toDelete && (
        <ConfirmModal
          title={t('Delete expense?')}
          message={t("Delete the {amount} expense from {merchant}? This can't be undone.", { amount: fmtMoney(toDelete.amount, toDelete.currency), merchant: toDelete.merchant })}
          busy={deleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}

function CreateExpenseModal({ categories, onClose, onCreate }) {
  const { t } = useT();
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
    if (!merchant.trim()) return setError(t('Add a merchant name.'));
    if (Number.isNaN(parsedAmount) || parsedAmount < 0) return setError(t('Enter a valid amount.'));
    if (Number.isNaN(parsedVat) || parsedVat < 0) return setError(t('Enter a valid VAT amount, or leave it empty.'));
    if (parsedVat > parsedAmount) return setError(t('VAT can not be more than the total amount.'));

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
      setError(err.message || t('Could not save the expense'));
      setBusy(false);
    }
  }

  return (
    <Modal
      title={t('Add expense')}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>{t('Cancel')}</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={busy}>
            {busy ? t('Saving…') : t('Save expense')}
          </button>
        </>
      }
    >
      <div className="field">
        <label>{t('Merchant')}</label>
        <input type="text" autoFocus placeholder={t('e.g. Figma Inc.')} value={merchant} onChange={(e) => setMerchant(e.target.value)} />
      </div>
      <div className="field-row">
        <div className="field">
          <label>{t('Date')}</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label>{t('Category')}</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => <option key={c} value={c}>{t(c)}</option>)}
          </select>
        </div>
      </div>
      <div className="field-row">
        <div className="field" style={{ marginBottom: 0 }}>
          <label>{t('Amount (€, total paid)')}</label>
          <input type="text" inputMode="decimal" placeholder="45.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>{t('VAT included (€)')}</label>
          <input type="text" inputMode="decimal" placeholder="7.50" value={vat} onChange={(e) => setVat(e.target.value)} />
        </div>
      </div>
      {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 0 }}>{error}</p>}
    </Modal>
  );
}
