import { useEffect, useRef, useState } from 'react';
import { useInbox } from '../hooks/useInbox';
import { api } from '../lib/api';
import { prepareUpload } from '../lib/image';
import { fmtMoney, fmtDate, todayISO } from '../lib/format';
import Modal from '../components/Modal';
import Icon from '../components/layout/Icon';

const CATEGORIES = ['Software', 'Travel', 'Office', 'Meals', 'Marketing', 'Materials', 'Shipping', 'Other'];

export default function Inbox({ business, onChanged }) {
  const { docs, loading, refetch } = useInbox(business.id);
  const [pending, setPending] = useState([]); // files being scanned right now
  const [reviewing, setReviewing] = useState(null);
  const [error, setError] = useState('');
  const [found, setFound] = useState('');
  const [drag, setDrag] = useState(false);
  const fileInput = useRef(null);

  function setStep(tempId, step) {
    setPending((p) => p.map((x) => (x.id === tempId ? { ...x, step } : x)));
  }

  async function scanOne(file, tempId) {
    let stage = 'preparing the file';
    try {
      setStep(tempId, 'Preparing…');
      const prepared = await prepareUpload(file);
      stage = 'sending it to the server';
      setStep(tempId, 'Sending…');
      const { documents } = await api.scanReceipt({ businessId: business.id, ...prepared });
      setPending((p) => p.filter((x) => x.id !== tempId));
      if (documents.length > 1) setFound((f) => `${f ? `${f} ` : ''}Found ${documents.length} receipts in ${file.name}.`);
      await refetch();
      onChanged?.();
    } catch (err) {
      const raw = err?.message || String(err);
      const network = /failed to fetch|networkerror|load failed/i.test(raw);
      const msg = network
        ? 'Could not reach the server (network error while ' + stage + ').'
        : `${raw} (while ${stage})`;
      setPending((p) => p.map((x) => (x.id === tempId ? { ...x, failed: msg } : x)));
    }
  }

  function handleFiles(fileList) {
    setError('');
    setFound('');
    const files = Array.from(fileList || []).slice(0, 10);
    if (!files.length) {
      setError('No file was received from the picker. Please try again.');
      return;
    }
    const entries = files.map((f, i) => ({ id: `${Date.now()}-${i}`, name: f.name || 'photo', file: f }));
    setPending((p) => [...entries.map(({ id, name, file }) => ({ id, name, step: 'Waiting…', info: `${file.type || 'unknown type'}, ${Math.round(file.size / 1024)} KB` })), ...p]);
    // One at a time keeps things gentle on the server and on phones.
    (async () => { for (const e of entries) await scanOne(e.file, e.id); })();
  }

  const ready = docs.filter((d) => d.state === 'ready');
  const supplierCount = ready.filter((d) => d.source === 'supplier').length;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Financial Inbox</h1>
          <p className="page-sub">
            Where receipts wait to be checked. Snap a receipt or drop a PDF, we read it, you confirm it, and it becomes an expense.
            {' '}Files are kept in your connected cloud storage — only the text lives here.
          </p>
        </div>
      </div>

      <div
        className={`dropzone ${drag ? 'drag' : ''}`}
        onClick={() => fileInput.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
      >
        <div className="dropzone-icon"><Icon name="camera" size={22} /></div>
        <h3>Snap it or drop it</h3>
        <p>Take a photo of a receipt, or pick several from your gallery. One photo or PDF can hold several receipts.</p>
        <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); fileInput.current?.click(); }}>
          <Icon name="plus" size={15} strokeWidth={2} />
          Add a receipt
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*,application/pdf"
          multiple
          hidden
          onClick={(e) => { e.stopPropagation(); e.target.value = ''; }}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {error && <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>}
      {found && <p style={{ color: 'var(--accent-strong)', fontSize: 13 }}>{found} Each one is listed below to review.</p>}

      <div className="panel">
        {pending.map((p) => (
          <div className="queue-item" key={p.id}>
            <div className="queue-thumb"><Icon name="invoice" size={18} /></div>
            <div className="queue-main">
              <div className="queue-name">{p.name}{p.info ? <span className="cell-soft" style={{ fontWeight: 400, marginLeft: 8, fontSize: 12 }}>{p.info}</span> : null}</div>
              {p.failed ? (
                <div className="queue-status" style={{ color: 'var(--red)' }}>{p.failed}</div>
              ) : (
                <div className="queue-status processing"><span className="spinner" />{p.step || 'Reading your receipt…'}{p.step === 'Sending…' ? ' reading your receipt…' : ''}</div>
              )}
            </div>
            {p.failed && (
              <button className="btn btn-sm queue-action" onClick={() => setPending((x) => x.filter((i) => i.id !== p.id))}>Dismiss</button>
            )}
          </div>
        ))}

        {ready.map((d) => (
          <div className="queue-item" key={d.id}>
            <div className="queue-thumb"><Icon name={d.source === 'supplier' ? 'network' : 'invoice'} size={18} /></div>
            <div className="queue-main">
              <div className="queue-name">
                {d.extracted_merchant || d.file_name}
                {d.source === 'supplier' && <span className="badge gray" style={{ marginLeft: 8 }}>From supplier</span>}
              </div>
              <div className="queue-status ready">
                Ready to review
                {d.extracted_amount != null && <> · {fmtMoney(d.extracted_amount, d.extracted_currency || business.currency)}</>}
                {d.extracted_date && <> · {fmtDate(d.extracted_date)}</>}
              </div>
            </div>
            <button className="btn btn-primary btn-sm queue-action" onClick={() => setReviewing(d)}>Review</button>
          </div>
        ))}

        {!loading && ready.length === 0 && pending.length === 0 && (
          <div className="empty-hint">Nothing waiting. New scans and supplier invoices will show up here.</div>
        )}
        {loading && pending.length === 0 && <div className="empty-hint">Loading…</div>}
      </div>

      {supplierCount > 0 && (
        <p className="cell-soft" style={{ fontSize: 12.5, marginTop: 10 }}>
          {supplierCount} invoice{supplierCount === 1 ? '' : 's'} sent to you by suppliers on HandyCFO.
        </p>
      )}

      {reviewing && (
        <ReviewModal
          doc={reviewing}
          business={business}
          onClose={() => setReviewing(null)}
          onDone={async () => { setReviewing(null); await refetch(); onChanged?.(); }}
        />
      )}
    </div>
  );
}

export function ReviewModal({ doc, business, onClose, onDone, title = 'Review document' }) {
  const [merchant, setMerchant] = useState(doc.extracted_merchant || '');
  const [date, setDate] = useState(doc.extracted_date || todayISO());
  const [category, setCategory] = useState(doc.extracted_category || 'Other');
  const [amount, setAmount] = useState(doc.extracted_amount != null ? String(doc.extracted_amount) : '');
  const [vat, setVat] = useState(doc.extracted_vat != null ? String(doc.extracted_vat) : '');
  const [currency, setCurrency] = useState(doc.extracted_currency || business.currency || 'EUR');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fileUrl, setFileUrl] = useState(null);
  const [fileState, setFileState] = useState(doc.receipt_provider === 'none' ? 'none' : 'loading');
  const isPdf = /\.pdf$/i.test(doc.file_name || '');

  // Load the preview once. The link is short-lived and comes straight
  // from the user's storage, never from our database.
  useEffect(() => {
    if (doc.receipt_provider === 'none') return;
    let cancelled = false;
    api.inboxFileLink(doc.id)
      .then((r) => { if (!cancelled) { setFileUrl(r.url); setFileState('ready'); } })
      .catch(() => { if (!cancelled) setFileState('error'); });
    return () => { cancelled = true; };
  }, [doc.id, doc.receipt_provider]);

  async function confirm() {
    setError('');
    const amt = parseFloat(String(amount).replace(',', '.'));
    const v = vat.trim() === '' ? 0 : parseFloat(String(vat).replace(',', '.'));
    if (!merchant.trim()) return setError('Add a merchant name.');
    if (Number.isNaN(amt) || amt < 0) return setError('Enter a valid amount.');
    if (Number.isNaN(v) || v < 0) return setError('Enter a valid VAT amount, or leave it empty.');
    if (v > amt) return setError('VAT can not be more than the total amount.');
    setBusy(true);
    try {
      await api.confirmInboxDoc(doc.id, { merchant: merchant.trim(), date, category, amount: amt, vat: v, currency });
      await onDone();
    } catch (err) {
      setError(err.message || 'Could not record the expense');
      setBusy(false);
    }
  }

  async function discard() {
    setBusy(true);
    setError('');
    try {
      await api.discardInboxDoc(doc.id);
      await onDone();
    } catch (err) {
      setError(err.message || 'Could not discard this document');
      setBusy(false);
    }
  }

  const confidenceNote = doc.extracted_confidence === 'low'
    ? 'We were not sure about this one. Please check each field.'
    : doc.extracted_confidence === 'medium'
      ? 'Please double-check the amounts before you confirm.'
      : doc.source === 'supplier' ? 'Sent to you on HandyCFO.' : 'Read automatically. Fix anything that looks off.';

  return (
    <Modal
      title={title}
      onClose={onClose}
      maxWidth={860}
      footer={
        <>
          <button className="btn" onClick={discard} disabled={busy} style={{ marginRight: 'auto' }}>Discard</button>
          <button className="btn" onClick={onClose} disabled={busy}>Later</button>
          <button className="btn btn-primary" onClick={confirm} disabled={busy}>
            {busy ? 'Saving…' : 'Confirm & record'}
          </button>
        </>
      }
    >
      <div className="review-split" style={{ margin: -20 }}>
        <div className="review-image">
          {fileState === 'ready' && !isPdf && <img src={fileUrl} alt="Receipt" style={{ maxWidth: '100%', maxHeight: 360, borderRadius: 6 }} />}
          {fileState === 'ready' && isPdf && (
            <a className="btn" href={fileUrl} target="_blank" rel="noreferrer">Open the PDF</a>
          )}
          {fileState === 'loading' && <span className="spinner" />}
          {fileState === 'error' && <span className="cell-soft" style={{ fontSize: 12.5 }}>Could not load the file preview.</span>}
          {fileState === 'none' && <span className="cell-soft" style={{ fontSize: 12.5, textAlign: 'center' }}>No file attached.<br />This came in as an invoice from a supplier.</span>}
        </div>
        <div className="review-form">
          <div className="ai-note"><Icon name="sparkle" size={13} />{confidenceNote}</div>
          {doc.extracted_notes && <p className="cell-soft" style={{ fontSize: 12, marginTop: -6 }}>{doc.extracted_notes}</p>}
          <div className="field">
            <label>Merchant</label>
            <input type="text" value={merchant} onChange={(e) => setMerchant(e.target.value)} />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="field">
              <label>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {[...new Set([...CATEGORIES, category])].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Total paid</label>
              <input type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="field">
              <label>VAT included</label>
              <input type="text" inputMode="decimal" value={vat} onChange={(e) => setVat(e.target.value)} />
            </div>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Currency</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="EUR">EUR</option><option value="USD">USD</option><option value="GBP">GBP</option>
            </select>
          </div>
          {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 0 }}>{error}</p>}
        </div>
      </div>
    </Modal>
  );
}
