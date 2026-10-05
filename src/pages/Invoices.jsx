import { useMemo, useState } from 'react';
import { useInvoices } from '../hooks/useInvoices';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Icon from '../components/layout/Icon';
import { useContacts } from '../hooks/useContacts';
import { api } from '../lib/api';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'Paid', label: 'Paid' },
  { key: 'Sent', label: 'Pending' },
  { key: 'Overdue', label: 'Overdue' },
  { key: 'Draft', label: 'Draft' },
];

const BADGE_CLASS = { Paid: 'green', Sent: 'amber', Overdue: 'red', Draft: 'gray' };
const BADGE_LABEL = { Paid: 'Paid', Sent: 'Pending', Overdue: 'Overdue', Draft: 'Draft' };
const REMINDER_LABEL = { none: '—', '1st': '1st', '2nd': '2nd', final: 'Final' };

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

function plusDaysISO(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// The server's daily job flips Sent -> Overdue, but between runs the
// table shouldn't show a past-due invoice as "Pending". Derive it here.
function displayStatus(inv) {
  if (inv.status === 'Sent' && inv.due_date < todayISO()) return 'Overdue';
  return inv.status;
}

function describeSend(r, prefix) {
  const parts = [];
  if (r.emailed) parts.push(`Emailed to ${r.emailedTo}`);
  if (r.deliveredInApp) parts.push('delivered to their HandyCFO inbox');
  if (!parts.length) return `${prefix}${r.emailError || 'Marked as sent.'}`;
  const text = parts.join(' and ');
  return `${prefix}${text.charAt(0).toUpperCase()}${text.slice(1)}.${r.emailError ? ` ${r.emailError}` : ''}`;
}

export default function Invoices({ business }) {
  const { invoices, loading, refetch, createInvoice, updateInvoice, deleteInvoice } = useInvoices(business.id);
  const [filter, setFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const { contacts } = useContacts();
  const [sendingId, setSendingId] = useState(null);

  const rows = useMemo(
    () => invoices
      .map((inv) => ({ ...inv, shownStatus: displayStatus(inv) }))
      .filter((inv) => filter === 'all' || inv.shownStatus === filter),
    [invoices, filter]
  );

  async function handleToggleReminders(inv) {
    setError('');
    try {
      await updateInvoice(inv.id, { auto_reminders: !inv.auto_reminders });
    } catch (err) {
      setError(err.message || 'Could not update reminders');
    }
  }

  async function handleSend(inv) {
    setError('');
    setNotice('');
    setSendingId(inv.id);
    try {
      const r = await api.sendInvoice(inv.id);
      await refetch();
      setNotice(describeSend(r, ''));
    } catch (err) {
      setError(err.message || 'Could not send the invoice');
    } finally {
      setSendingId(null);
    }
  }

  async function handleDownload(inv) {
    setError('');
    try {
      await api.downloadInvoicePdf(inv.id);
    } catch (err) {
      setError(err.message || 'Could not download the PDF');
    }
  }

  async function handleMarkPaid(inv) {
    setError('');
    try {
      await updateInvoice(inv.id, { status: 'Paid', paid_at: new Date().toISOString() });
    } catch (err) {
      setError(err.message || 'Could not mark the invoice as paid');
    }
  }

  async function handleConfirmDelete() {
    setDeleting(true);
    setError('');
    try {
      await deleteInvoice(toDelete.id);
      setToDelete(null);
    } catch (err) {
      setError(err.message || 'Could not delete the invoice');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-sub">Money coming in. Send a bill to a client, then mark it paid when the money arrives. Reminders go out automatically if it is late.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Icon name="plus" size={15} strokeWidth={2} />
          Create new invoice
        </button>
      </div>

      {error && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 0 }}>{error}</p>}
      {notice && <p style={{ color: 'var(--accent-strong)', fontSize: 13, marginTop: 0 }}>{notice}</p>}

      <div className="panel">
        <div className="table-toolbar">
          <div className="filter-pills">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={`pill ${filter === f.key ? 'active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th className="amt">Amount</th>
                <th>Due date</th>
                <th>Status</th>
                <th>Reminders sent</th>
                <th>Automated reminders</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="empty-hint">Loading…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-hint">
                    {invoices.length === 0
                      ? 'No invoices yet. Create your first one to start tracking what you are owed.'
                      : 'No invoices in this view.'}
                  </td>
                </tr>
              )}
              {!loading && rows.map((inv) => (
                <tr key={inv.id}>
                  <td className="cell-primary">
                    {inv.client_name}
                    {inv.client_email && (
                      <div className="cell-soft" style={{ fontSize: 11.5, fontWeight: 400 }}>{inv.client_email}</div>
                    )}
                  </td>
                  <td className="amt cell-primary">{fmtMoney(inv.amount, inv.currency)}</td>
                  <td className="cell-soft">{fmtDate(inv.due_date)}</td>
                  <td>
                    <span className={`badge ${BADGE_CLASS[inv.shownStatus]}`}>
                      <span className="dot" />
                      {BADGE_LABEL[inv.shownStatus]}
                    </span>
                  </td>
                  <td className="cell-soft">{REMINDER_LABEL[inv.reminder_level] || '—'}</td>
                  <td>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={!!inv.auto_reminders}
                        onChange={() => handleToggleReminders(inv)}
                      />
                      <span className="toggle-track" />
                    </label>
                  </td>
                  <td>
                    <div className="row-actions" style={{ gap: 6, alignItems: 'center' }}>
                      {inv.status === 'Draft' && (
                        <button className="btn btn-sm btn-primary" disabled={sendingId === inv.id} onClick={() => handleSend(inv)}>
                          {sendingId === inv.id ? 'Sending…' : 'Send'}
                        </button>
                      )}
                      {inv.status !== 'Paid' && (
                        <button className="btn btn-sm" onClick={() => handleMarkPaid(inv)}>Mark paid</button>
                      )}
                      <button className="btn btn-sm" title="Download as PDF" onClick={() => handleDownload(inv)}>PDF</button>
                      <button className="icon-btn" title="Delete invoice" onClick={() => setToDelete(inv)}>
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
        <CreateInvoiceModal
          contacts={contacts.filter((c) => c.relationship === 'Client')}
          onClose={() => setShowCreate(false)}
          onCreate={async (fields) => {
            const created = await createInvoice(fields);
            setShowCreate(false);
            // Sending also emails the client (when we have an address) and, if they
            // use HandyCFO, drops it into their inbox.
            if (created.status === 'Sent' && (created.client_contact_id || created.client_email)) {
              try {
                setNotice(describeSend(await api.sendInvoice(created.id), 'Invoice created. '));
              } catch (err) {
                setError(err.message || 'The invoice was saved but could not be sent.');
              }
            } else if (created.status === 'Sent') {
              setNotice('Invoice created. Add the client\'s email next time and we will email it for you.');
            }
          }}
        />
      )}

      {toDelete && (
        <ConfirmModal
          title="Delete invoice?"
          message={`Delete the ${fmtMoney(toDelete.amount, toDelete.currency)} invoice for ${toDelete.client_name}? This can't be undone.`}
          busy={deleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}

function CreateInvoiceModal({ contacts = [], onClose, onCreate }) {
  const [contactId, setContactId] = useState('');
  const [client, setClient] = useState('');
  const [email, setEmail] = useState('');
  const [issue, setIssue] = useState(todayISO());
  const [due, setDue] = useState(plusDaysISO(14));
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('Sent');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setError('');
    const parsed = parseFloat(String(amount).replace(',', '.'));
    if (!client.trim()) return setError('Add a client name.');
    if (!(parsed >= 0) || Number.isNaN(parsed)) return setError('Enter a valid amount.');
    if (due < issue) return setError('The due date can not be before the issue date.');

    setBusy(true);
    try {
      await onCreate({
        client_contact_id: contactId || null,
        client_name: client.trim(),
        client_email: email.trim() || null,
        issue_date: issue,
        due_date: due,
        amount: parsed,
        status,
      });
    } catch (err) {
      setError(err.message || 'Could not create the invoice');
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Create new invoice"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={busy}>
            {busy ? 'Creating…' : 'Create invoice'}
          </button>
        </>
      }
    >
      {contacts.length > 0 && (
        <div className="field">
          <label>From your network (optional)</label>
          <select
            value={contactId}
            onChange={(e) => {
              const id = e.target.value;
              setContactId(id);
              const c = contacts.find((x) => x.id === id);
              if (c) { setClient(c.name); setEmail(c.email || ''); }
            }}
          >
            <option value="">Someone new</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.on_platform ? ' · on HandyCFO' : ''}</option>
            ))}
          </select>
        </div>
      )}
      <div className="field">
        <label>Client</label>
        <input type="text" autoFocus placeholder="e.g. Brantwood Ltd." value={client} onChange={(e) => setClient(e.target.value)} />
      </div>
      <div className="field">
        <label>Client email (needed for automatic reminders)</label>
        <input type="email" placeholder="billing@client.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="field-row">
        <div className="field">
          <label>Issue date</label>
          <input type="date" value={issue} onChange={(e) => setIssue(e.target.value)} />
        </div>
        <div className="field">
          <label>Due date</label>
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>Amount (€)</label>
        <input type="text" inputMode="decimal" placeholder="1200.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <div className="field" style={{ marginBottom: 0 }}>
        <label>Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="Draft">Draft</option>
          <option value="Sent">Sent</option>
        </select>
      </div>
      {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 0 }}>{error}</p>}
    </Modal>
  );
}
