import { useMemo, useState } from 'react';
import { useInvoices } from '../hooks/useInvoices';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Icon from '../components/layout/Icon';
import { useContacts } from '../hooks/useContacts';
import { api } from '../lib/api';
import { useT } from '../lib/i18n';
import { COUNTRIES, INVOICE_LANGUAGES, setupFor } from '../lib/countries';
import { computeInvoice } from '../lib/invoiceMath';

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

function describeSend(r, prefix, t) {
  const problems = [r.emailError, r.appError].filter(Boolean).join(' ');
  let text = '';
  if (r.emailed && r.deliveredInApp) text = t('Emailed to {email} and delivered to their HandyCFO inbox.', { email: r.emailedTo });
  else if (r.emailed) text = t('Emailed to {email}.', { email: r.emailedTo });
  else if (r.deliveredInApp) text = t('Delivered to their HandyCFO inbox.');
  if (!text) return `${prefix}${problems || t('Marked as sent.')}`;
  return `${prefix}${text}${problems ? ` ${problems}` : ''}`;
}

// Where should the invoice go? Email, the client's HandyCFO inbox, or both.
function SendOptions({ email, onPlatform, alreadyEmailed, value, onChange, appHint }) {
  const { t } = useT();
  const emailAvailable = !!email && !alreadyEmailed;
  const emailChecked = emailAvailable && (value.email ?? true);
  const appChecked = onPlatform && (value.app ?? true);
  return (
    <div className="field" style={{ marginBottom: 0 }}>
      <label>{t('How should we send it?')}</label>
      <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontWeight: 500, opacity: emailAvailable ? 1 : 0.55, marginBottom: 10 }}>
        <input type="checkbox" style={{ width: 'auto', marginTop: 3 }} disabled={!emailAvailable} checked={emailChecked}
          onChange={(e) => onChange({ ...value, email: e.target.checked })} />
        <span>
          {t('Email it as a PDF')}
          <span className="cell-soft" style={{ display: 'block', fontSize: 12, fontWeight: 400 }}>
            {alreadyEmailed ? t('Already emailed to this client.') : email ? t('To {email}', { email }) : t('Add the client\'s email address to use this.')}
          </span>
        </span>
      </label>
      <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontWeight: 500, opacity: onPlatform ? 1 : 0.55 }}>
        <input type="checkbox" style={{ width: 'auto', marginTop: 3 }} disabled={!onPlatform} checked={appChecked}
          onChange={(e) => onChange({ ...value, app: e.target.checked })} />
        <span>
          {t('Send to their HandyCFO inbox')}
          <span className="cell-soft" style={{ display: 'block', fontSize: 12, fontWeight: 400 }}>
            {onPlatform ? t('They can review it and record it as an expense.') : (appHint || t('Only for clients from your network who use HandyCFO.'))}
          </span>
        </span>
      </label>
    </div>
  );
}

function channelsFrom({ email, onPlatform, alreadyEmailed, value }) {
  const out = [];
  if (email && !alreadyEmailed && (value.email ?? true)) out.push('email');
  if (onPlatform && (value.app ?? true)) out.push('app');
  return out;
}

// What is still empty in the business profile that every invoice needs.
function profileGaps(b) {
  const gaps = [];
  if (!b.street || !b.postal_code || !b.city) gaps.push('address');
  if (!b.bank_iban && !b.bank_account_number) gaps.push('bank details');
  if (!b.tax_number && !b.vat_number) gaps.push('tax number');
  return gaps;
}

export default function Invoices({ business, onOpenSettings }) {
  const { t } = useT();
  const { invoices, loading, refetch, createInvoice, saveDraft, loadItems, updateInvoice, deleteInvoice } = useInvoices(business.id);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const { contacts } = useContacts();
  const [toSend, setToSend] = useState(null);

  const rows = useMemo(
    () => invoices
      .map((inv) => ({ ...inv, shownStatus: displayStatus(inv) }))
      .filter((inv) => filter === 'all' || inv.shownStatus === filter),
    [invoices, filter]
  );

  async function openEdit(inv) {
    setError('');
    try {
      const items = await loadItems(inv.id);
      setEditing({ invoice: inv, items });
    } catch (err) {
      setError(err.message || t('Could not open the invoice'));
    }
  }

  function describeSaved(res, verb) {
    const base = verb;
    if (res.missing?.length) return `${base} ${t('Before you can send it, it still needs:')} ${res.missing.map((m) => m.message).join(' ')}`;
    return base;
  }

  async function handleToggleReminders(inv) {
    setError('');
    try {
      await updateInvoice(inv.id, { auto_reminders: !inv.auto_reminders });
    } catch (err) {
      setError(err.message || t('Could not update reminders'));
    }
  }

  async function handleSend(inv, channels) {
    setError('');
    setNotice('');
    const r = await api.sendInvoice(inv.id, channels);
    await refetch();
    setNotice(describeSend(r, '', t));
  }

  async function handleDownload(inv) {
    setError('');
    try {
      await api.downloadInvoicePdf(inv.id);
    } catch (err) {
      setError(err.message || t('Could not download the PDF'));
    }
  }

  async function handleMarkPaid(inv) {
    setError('');
    try {
      await updateInvoice(inv.id, { status: 'Paid', paid_at: new Date().toISOString() });
    } catch (err) {
      setError(err.message || t('Could not mark the invoice as paid'));
    }
  }

  async function handleConfirmDelete() {
    setDeleting(true);
    setError('');
    try {
      await deleteInvoice(toDelete.id);
      setToDelete(null);
    } catch (err) {
      setError(err.message || t('Could not delete the invoice'));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">{t('Invoices')}</h1>
          <p className="page-sub">{t('Money coming in. Send a bill to a client, then mark it paid when the money arrives. Reminders go out automatically if it is late.')}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Icon name="plus" size={15} strokeWidth={2} />
          {t('Create new invoice')}
        </button>
      </div>

      {error && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 0 }}>{error}</p>}
      {notice && <p style={{ color: 'var(--accent-strong)', fontSize: 13, marginTop: 0 }}>{notice}</p>}
      {profileGaps(business).length > 0 && (
        <div className="panel profile-banner">
          <div>
            <strong>{t('Finish your business profile')}</strong>
            <div className="cell-soft" style={{ fontSize: 12.5 }}>
              {t('Invoices print your {gaps}. Add them once in Settings and every invoice uses them.', { gaps: profileGaps(business).map((g) => t(g)).join(', ') })}
            </div>
          </div>
          <button className="btn btn-sm btn-primary" onClick={onOpenSettings}>{t('Open Settings')}</button>
        </div>
      )}

      <div className="panel">
        <div className="table-toolbar">
          <div className="filter-pills">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={`pill ${filter === f.key ? 'active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {t(f.label)}
              </button>
            ))}
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('Client')}</th>
                <th className="amt">{t('Amount')}</th>
                <th>{t('Due date')}</th>
                <th>{t('Status')}</th>
                <th>{t('Reminders sent')}</th>
                <th>{t('Automated reminders')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="empty-hint">{t('Loading…')}</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-hint">
                    {invoices.length === 0
                      ? t('No invoices yet. Create your first one to start tracking what you are owed.')
                      : t('No invoices in this view.')}
                  </td>
                </tr>
              )}
              {!loading && rows.map((inv) => (
                <tr key={inv.id}>
                  <td className="cell-primary">
                    {inv.client_name}
                    <div className="cell-soft" style={{ fontSize: 11.5, fontWeight: 400 }}>{inv.invoice_number || t('No number yet (assigned when sent)')}</div>
                    {inv.client_email && (
                      <div className="cell-soft" style={{ fontSize: 11.5, fontWeight: 400 }}>{inv.client_email}</div>
                    )}
                  </td>
                  <td className="amt cell-primary">{fmtMoney(inv.amount, inv.currency)}</td>
                  <td className="cell-soft">{fmtDate(inv.due_date)}</td>
                  <td>
                    <span className={`badge ${BADGE_CLASS[inv.shownStatus]}`}>
                      <span className="dot" />
                      {t(BADGE_LABEL[inv.shownStatus])}
                    </span>
                  </td>
                  <td className="cell-soft">{t(REMINDER_LABEL[inv.reminder_level] || '—')}</td>
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
                        <button className="btn btn-sm" onClick={() => openEdit(inv)}>{t('Edit')}</button>
                      )}
                      {inv.status !== 'Paid' && (
                        <button className="btn btn-sm btn-primary" onClick={() => setToSend(inv)}>
                          {inv.status === 'Draft' ? t('Send') : t('Send again')}
                        </button>
                      )}
                      {inv.status !== 'Paid' && (
                        <button className="btn btn-sm" onClick={() => handleMarkPaid(inv)}>{t('Mark paid')}</button>
                      )}
                      <button className="btn btn-sm" title={t('Download as PDF')} onClick={() => handleDownload(inv)}>{t('PDF')}</button>
                      <button className="icon-btn" title={t('Delete invoice')} onClick={() => setToDelete(inv)}>
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

      {(showCreate || editing) && (
        <InvoiceModal
          business={business}
          contacts={contacts}
          invoice={editing?.invoice}
          existingItems={editing?.items}
          onClose={() => { setShowCreate(false); setEditing(null); }}
          onSave={async (fields, sendNow) => {
            const res = editing ? await saveDraft(editing.invoice.id, fields) : await createInvoice(fields);
            setShowCreate(false);
            setEditing(null);
            setNotice(describeSaved(res, t('Saved as a draft.')));
            if (sendNow) setToSend(res.invoice);
          }}
        />
      )}

      {toSend && (
        <SendModal
          invoice={toSend}
          contact={contacts.find((c) => c.id === toSend.client_contact_id) || null}
          onClose={() => setToSend(null)}
          onOpenSettings={onOpenSettings}
          onSend={async (channels) => { await handleSend(toSend, channels); setToSend(null); }}
        />
      )}

      {toDelete && (
        <ConfirmModal
          title={t('Delete invoice?')}
          message={toDelete.status === 'Draft'
            ? t("Delete the {amount} draft for {client}? This can't be undone.", { amount: fmtMoney(toDelete.amount, toDelete.currency), client: toDelete.client_name })
            : t('Delete the {amount} invoice {number} for {client}? Its number will not be used again, so your numbering will have a gap. In most countries sent invoices must be kept for years, so only delete one if it was created by mistake.', { amount: fmtMoney(toDelete.amount, toDelete.currency), number: toDelete.invoice_number || '', client: toDelete.client_name })}
          busy={deleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}

const emptyItem = (rate) => ({ description: '', quantity: '1', unitPrice: '', taxRate: String(rate ?? 0) });
const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return Number.isNaN(n) ? 0 : n; };

function InvoiceModal({ business, contacts = [], invoice, existingItems, onClose, onSave }) {
  const { t } = useT();
  const setup = setupFor(business.country);
  const taxEnabled = business.tax_mode === 'vat' || business.tax_mode === 'sales_tax';
  const defaultRate = Number(business.default_tax_rate) || 0;
  const currency = invoice?.currency || business.currency || 'EUR';
  const edit = !!invoice;

  const [contactId, setContactId] = useState(invoice?.client_contact_id || '');
  const [f, setF] = useState({
    client: invoice?.client_name || '', email: invoice?.client_email || '',
    street: invoice?.client_street || '', postal: invoice?.client_postal_code || '', city: invoice?.client_city || '',
    region: invoice?.client_region || '', country: invoice?.client_country || '', taxId: invoice?.client_tax_id || '',
    issue: invoice?.issue_date || todayISO(),
    due: invoice?.due_date || plusDaysISO(Number(business.payment_terms_days ?? 14)),
    serviceDate: invoice?.service_date || todayISO(), serviceEnd: invoice?.service_end_date || '',
    notes: invoice?.notes || '', language: invoice?.language || business.invoice_language || 'en',
  });
  const [period, setPeriod] = useState(!!invoice?.service_end_date);
  const [includeTax, setIncludeTax] = useState(!!invoice?.prices_include_tax);
  const [forceFull, setForceFull] = useState(invoice?.invoice_mode === 'full' && !setup.smallValue);
  const [items, setItems] = useState(() => (existingItems?.length
    ? existingItems.map((i) => ({ description: i.description, quantity: String(Number(i.quantity)), unitPrice: String(Number(i.unit_price)), taxRate: String(Number(i.tax_rate)) }))
    : [emptyItem(defaultRate)]));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const setItem = (i, k) => (e) => setItems((arr) => arr.map((it, j) => (j === i ? { ...it, [k]: e.target.value } : it)));
  const rates = [...new Set([...(setup.rates.length ? setup.rates : []), defaultRate])];

  const calc = useMemo(
    () => computeInvoice(items.map((i) => ({ description: i.description, quantity: num(i.quantity), unitPrice: num(i.unitPrice), taxRate: num(i.taxRate) })), { includeTax: taxEnabled && includeTax, taxEnabled }),
    [items, includeTax, taxEnabled]
  );
  const money = (cents) => fmtMoney(cents / 100, currency);

  const sv = setup.smallValue;
  const simplified = !forceFull && sv && sv.currency === currency && calc.grossCents <= sv.limit * 100
    && (!f.country || f.country === business.country);

  function pickContact(id) {
    setContactId(id);
    const c = contacts.find((x) => x.id === id);
    if (!c) return;
    setF((x) => ({
      ...x, client: c.name, email: c.email || '', street: c.street || '', postal: c.postal_code || '', city: c.city || '',
      region: c.region || '', country: c.country || '', taxId: c.tax_id || '', language: c.language || x.language,
    }));
  }

  async function submit(sendNow) {
    setError('');
    if (!f.client.trim()) return setError(t('Add a client name.'));
    if (f.due < f.issue) return setError(t('The due date can not be before the issue date.'));
    if (items.some((i) => !i.description.trim())) return setError(t('Every line needs a description.'));
    if (items.some((i) => !(num(i.quantity) > 0))) return setError(t('Every line needs a quantity above zero.'));
    setBusy(true);
    try {
      await onSave({
        contactId: contactId || null,
        clientName: f.client.trim(), clientEmail: f.email.trim() || null,
        clientStreet: f.street, clientPostalCode: f.postal, clientCity: f.city, clientRegion: f.region,
        clientCountry: f.country || null, clientTaxId: f.taxId,
        issueDate: f.issue, dueDate: f.due,
        serviceDate: f.serviceDate || null, serviceEndDate: period ? f.serviceEnd || null : null,
        currency, language: f.language, notes: f.notes, pricesIncludeTax: taxEnabled && includeTax,
        mode: forceFull ? 'full' : 'auto',
        items: items.map((i) => ({ description: i.description.trim(), quantity: num(i.quantity), unitPrice: num(i.unitPrice), taxRate: taxEnabled ? num(i.taxRate) : 0 })),
      }, sendNow);
    } catch (err) {
      setError(err.message || t('Could not save the invoice'));
      setBusy(false);
    }
  }

  return (
    <Modal
      title={edit ? t('Edit draft invoice') : t('Create new invoice')}
      onClose={onClose}
      maxWidth={680}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>{t('Cancel')}</button>
          <button className="btn" onClick={() => submit(false)} disabled={busy}>{busy ? t('Saving…') : t('Save draft')}</button>
          <button className="btn btn-primary" onClick={() => submit(true)} disabled={busy}>{t('Save and send')}</button>
        </>
      }
    >
      {contacts.length > 0 && (
        <div className="field">
          <label>{t('From your network (optional)')}</label>
          <select value={contactId} onChange={(e) => pickContact(e.target.value)}>
            <option value="">{t('Someone new')}</option>
            {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}{c.on_platform ? ` · ${t('on HandyCFO')}` : ''}</option>)}
          </select>
        </div>
      )}

      <div className="sub-head">{t('Customer')}</div>
      <div className="field-row">
        <div className="field"><label>{t('Name')}</label><input type="text" autoFocus placeholder={t('e.g. Brantwood Ltd.')} value={f.client} onChange={set('client')} /></div>
        <div className="field"><label>{t('Email (needed for sending and reminders)')}</label><input type="email" value={f.email} onChange={set('email')} /></div>
      </div>
      <div className="field"><label>{t('Street and number')}</label><input type="text" value={f.street} onChange={set('street')} /></div>
      <div className="field-row three">
        <div className="field"><label>{t('Postal code')}</label><input type="text" value={f.postal} onChange={set('postal')} /></div>
        <div className="field"><label>{t('City')}</label><input type="text" value={f.city} onChange={set('city')} /></div>
        {setupFor(f.country).needsRegion && <div className="field"><label>{t('State / province')}</label><input type="text" value={f.region} onChange={set('region')} /></div>}
      </div>
      <div className="field-row">
        <div className="field"><label>{t('Country')}</label>
          <select value={f.country} onChange={set('country')}>
            <option value="">{t('Not set')}</option>
            {COUNTRIES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
          </select>
        </div>
        <div className="field"><label>{t('VAT / tax ID')}</label><input type="text" value={f.taxId} onChange={set('taxId')} /></div>
      </div>

      <div className="sub-head">{t('Dates')}</div>
      <div className="field-row three">
        <div className="field"><label>{t('Invoice date')}</label><input type="date" value={f.issue} onChange={set('issue')} /></div>
        <div className="field"><label>{t('Due date')}</label><input type="date" value={f.due} onChange={set('due')} /></div>
        <div className="field"><label>{period ? t('Service from') : t('Delivery / service date')}</label><input type="date" value={f.serviceDate} onChange={set('serviceDate')} /></div>
      </div>
      <label className="check-line">
        <input type="checkbox" checked={period} onChange={(e) => setPeriod(e.target.checked)} />
        <span>{t('The service covers a period')}</span>
      </label>
      {period && <div className="field"><label>{t('Service until')}</label><input type="date" value={f.serviceEnd} min={f.serviceDate} onChange={set('serviceEnd')} /></div>}

      <div className="sub-head">{t('Lines')}</div>
      <div className="items-table">
        <div className={`items-row items-head ${taxEnabled ? 'with-tax' : ''}`}>
          <span>{t('Description')}</span><span>{t('Qty')}</span><span>{t('Unit price')}</span>{taxEnabled && <span>{t('Tax %')}</span>}<span className="amt">{t('Amount')}</span><span />
        </div>
        {items.map((it, i) => (
          <div className={`items-row ${taxEnabled ? 'with-tax' : ''}`} key={i}>
            <input type="text" placeholder={t('What you sold')} value={it.description} onChange={setItem(i, 'description')} />
            <input type="text" inputMode="decimal" value={it.quantity} onChange={setItem(i, 'quantity')} />
            <input type="text" inputMode="decimal" placeholder="0.00" value={it.unitPrice} onChange={setItem(i, 'unitPrice')} />
            {taxEnabled && (rates.length ? (
              <select value={it.taxRate} onChange={setItem(i, 'taxRate')}>
                {[...new Set([...rates, num(it.taxRate)])].map((r) => <option key={r} value={r}>{r}%</option>)}
              </select>
            ) : (
              <input type="text" inputMode="decimal" value={it.taxRate} onChange={setItem(i, 'taxRate')} />
            ))}
            <span className="amt items-amount">{money(calc.lines[i]?.grossCents ?? 0)}</span>
            <button className="icon-btn" title={t('Remove line')} disabled={items.length === 1} onClick={() => setItems((arr) => arr.filter((_, j) => j !== i))}>
              <Icon name="close" size={14} strokeWidth={2} />
            </button>
          </div>
        ))}
      </div>
      <button className="btn btn-sm" style={{ marginTop: 8 }} onClick={() => setItems((arr) => [...arr, emptyItem(defaultRate)])} disabled={items.length >= 50}>
        <Icon name="plus" size={13} strokeWidth={2} />{t('Add line')}
      </button>
      {taxEnabled && (
        <label className="check-line">
          <input type="checkbox" checked={includeTax} onChange={(e) => setIncludeTax(e.target.checked)} />
          <span>{t('The prices I entered already include tax')}</span>
        </label>
      )}

      <div className="totals-box">
        {taxEnabled && <div><span>{t('Net')}</span><span>{money(calc.netCents)}</span></div>}
        {taxEnabled && calc.groups.filter((g) => g.rate > 0 || g.vatCents > 0).map((g) => (
          <div key={g.rate}><span>{t('Tax {rate}%', { rate: g.rate })}</span><span>{money(g.vatCents)}</span></div>
        ))}
        <div className="grand"><span>{t('Total')}</span><span>{money(calc.grossCents)}</span></div>
      </div>
      {business.tax_mode === 'small_business' && <p className="sub-note">{t('You are set up as a small business without VAT, so no tax is added and the invoice carries the matching note.')}</p>}

      {sv && (
        <p className="sub-note">
          {simplified
            ? t('Invoice type: simplified (small amount). Fewer details are required.')
            : t('Invoice type: full invoice. It needs the customer address.')}
          {' '}
          <label className="check-line inline">
            <input type="checkbox" checked={forceFull} onChange={(e) => setForceFull(e.target.checked)} />
            <span>{t('Always make a full invoice')}</span>
          </label>
        </p>
      )}

      <div className="sub-head">{t('Extras')}</div>
      <div className="field-row">
        <div className="field"><label>{t('Invoice language')}</label>
          <select value={f.language} onChange={set('language')}>
            {INVOICE_LANGUAGES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
          </select>
        </div>
        <div className="field"><label>{t('Currency')}</label><input type="text" value={currency} disabled /></div>
      </div>
      <div className="field" style={{ marginBottom: 0 }}><label>{t('Note on the invoice (optional)')}</label>
        <textarea rows={2} value={f.notes} onChange={set('notes')} />
      </div>
      {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 0 }}>{error}</p>}
    </Modal>
  );
}

function SendModal({ invoice, contact, onClose, onSend, onOpenSettings }) {
  const { t } = useT();
  const [missing, setMissing] = useState([]);
  const email = invoice.client_email || contact?.email || '';
  const onPlatform = !!contact?.on_platform;
  const alreadyEmailed = !!invoice.sent_at;
  const [value, setValue] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const channels = channelsFrom({ email, onPlatform, alreadyEmailed, value });

  async function submit() {
    setBusy(true);
    setError('');
    try {
      await onSend(channels);
    } catch (err) {
      if (err.missing?.length) { setMissing(err.missing); setError(''); } else setError(err.message || t('Could not send the invoice'));
      setBusy(false);
    }
  }

  return (
    <Modal
      title={t('Send invoice to {client}', { client: invoice.client_name })}
      onClose={onClose}
      maxWidth={420}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>{t('Cancel')}</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>
            {busy ? t('Sending…') : channels.length ? t('Send') : invoice.status === 'Draft' ? t('Mark as sent') : t('Close')}
          </button>
        </>
      }
    >
      <SendOptions
        email={email} onPlatform={onPlatform} alreadyEmailed={alreadyEmailed} value={value} onChange={setValue}
        appHint={!invoice.client_contact_id
          ? t('This invoice was not created from a Network contact, so it can only be emailed.')
          : t('This contact is not matched to a HandyCFO account yet. Check their email on the Network page.')}
      />
      {channels.length === 0 && (
        <p className="cell-soft" style={{ fontSize: 12.5, marginBottom: 0 }}>
          {t('Nothing selected. You can still download the PDF with the PDF button and send it yourself.')}
        </p>
      )}
      {missing.length > 0 && (
        <div className="missing-box">
          <strong>{t('This invoice is not ready to send yet:')}</strong>
          <ul>{missing.map((m) => <li key={m.id}>{m.message}</li>)}</ul>
          <div className="cell-soft" style={{ fontSize: 12.5 }}>{t('Fix the invoice with Edit, or add the missing business details in Settings.')}</div>
          {missing.some((m) => m.where === 'profile') && (
            <button className="btn btn-sm btn-primary" style={{ marginTop: 8 }} onClick={() => { onClose(); onOpenSettings?.(); }}>{t('Open Settings')}</button>
          )}
        </div>
      )}
      {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 0 }}>{error}</p>}
    </Modal>
  );
}
