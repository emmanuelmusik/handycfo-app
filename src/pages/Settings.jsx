import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { api } from '../lib/api';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Icon from '../components/layout/Icon';
import { useT } from '../lib/i18n';
import { COUNTRIES, TAX_MODES, INVOICE_LANGUAGES, setupFor, ibanValid, cleanIban, formatIban } from '../lib/countries';

const PROFILE_KEYS = [
  'name', 'business_type', 'legal_name', 'country', 'currency', 'street', 'postal_code', 'city', 'region',
  'tax_number', 'vat_number', 'tax_mode', 'default_tax_rate', 'payment_terms_days',
  'bank_holder', 'bank_iban', 'bank_bic', 'bank_name', 'bank_account_number', 'bank_routing_code',
  'contact_email', 'contact_phone', 'website', 'invoice_prefix', 'invoice_start_number', 'invoice_language', 'invoice_footer',
];
const NUMERIC = ['default_tax_rate', 'payment_terms_days', 'invoice_start_number'];

const formFrom = (b) => {
  const f = {};
  for (const k of PROFILE_KEYS) f[k] = b[k] === null || b[k] === undefined ? '' : String(b[k]);
  if (!f.country) f.country = 'AT';
  if (!f.invoice_language) f.invoice_language = 'en';
  return f;
};

// The business details that appear on every invoice: address, tax numbers, bank.
function BusinessProfile({ business, onUpdateBusiness }) {
  const { t } = useT();
  const [form, setForm] = useState(() => formFrom(business));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const initial = JSON.stringify(formFrom(business));
  const dirty = JSON.stringify(form) !== initial;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setup = setupFor(form.country);

  function changeCountry(code) {
    const s = setupFor(code);
    setForm((f) => ({
      ...f,
      country: code,
      currency: s.currency,
      tax_mode: s.taxModes.includes(f.tax_mode) ? f.tax_mode : s.defaultTaxMode,
      default_tax_rate: String(s.defaultRate),
      region: s.needsRegion ? f.region : '',
    }));
  }

  const taxOn = form.tax_mode === 'vat' || form.tax_mode === 'sales_tax';

  async function save() {
    setError('');
    if (!form.name.trim()) return setError(t('The business needs a name.'));
    if (setup.bank === 'iban' && form.bank_iban.trim() && !ibanValid(form.bank_iban)) {
      return setError(t('That IBAN does not look right. Please check it for typos.'));
    }
    const patch = {};
    for (const k of PROFILE_KEYS) {
      const v = String(form[k] ?? '').trim();
      if (NUMERIC.includes(k)) {
        const n = Number(v);
        patch[k] = v === '' || Number.isNaN(n) ? null : n;
      } else patch[k] = v === '' ? null : v;
    }
    if (patch.bank_iban) patch.bank_iban = cleanIban(patch.bank_iban);
    if (patch.invoice_prefix) patch.invoice_prefix = patch.invoice_prefix.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 10);
    if (!patch.invoice_prefix) patch.invoice_prefix = 'INV';
    if (!patch.invoice_start_number || patch.invoice_start_number < 1) patch.invoice_start_number = 1;
    if (patch.payment_terms_days === null || patch.payment_terms_days < 0) patch.payment_terms_days = 14;
    if (patch.default_tax_rate === null) patch.default_tax_rate = 0;
    patch.name = form.name.trim();
    setSaving(true);
    try {
      const updated = await onUpdateBusiness(business.id, patch);
      setForm(formFrom(updated));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message || t('Could not save your changes'));
    } finally {
      setSaving(false);
    }
  }

  const bankFields = () => {
    if (setup.bank === 'iban') return (
      <>
        <div className="field"><label>{t('IBAN')}</label>
          <input type="text" placeholder="AT61 1904 3002 3457 3201" value={form.bank_iban} onChange={set('bank_iban')} onBlur={() => form.bank_iban && setForm((f) => ({ ...f, bank_iban: formatIban(f.bank_iban) }))} /></div>
        <div className="field-row">
          <div className="field"><label>{t('BIC / SWIFT')}</label><input type="text" value={form.bank_bic} onChange={set('bank_bic')} /></div>
          <div className="field"><label>{t('Bank name')}</label><input type="text" value={form.bank_name} onChange={set('bank_name')} /></div>
        </div>
      </>
    );
    if (setup.bank === 'uk') return (
      <>
        <div className="field-row">
          <div className="field"><label>{t('Sort code')}</label><input type="text" placeholder="12-34-56" value={form.bank_routing_code} onChange={set('bank_routing_code')} /></div>
          <div className="field"><label>{t('Account number')}</label><input type="text" value={form.bank_account_number} onChange={set('bank_account_number')} /></div>
        </div>
        <div className="field"><label>{t('Bank name')}</label><input type="text" value={form.bank_name} onChange={set('bank_name')} /></div>
      </>
    );
    if (setup.bank === 'us') return (
      <>
        <div className="field-row">
          <div className="field"><label>{t('Routing number (ABA)')}</label><input type="text" value={form.bank_routing_code} onChange={set('bank_routing_code')} /></div>
          <div className="field"><label>{t('Account number')}</label><input type="text" value={form.bank_account_number} onChange={set('bank_account_number')} /></div>
        </div>
        <div className="field"><label>{t('Bank name')}</label><input type="text" value={form.bank_name} onChange={set('bank_name')} /></div>
      </>
    );
    return (
      <>
        <div className="field-row">
          <div className="field"><label>{t('IBAN or account number')}</label><input type="text" value={form.bank_iban} onChange={set('bank_iban')} /></div>
          <div className="field"><label>{t('BIC / SWIFT / routing code')}</label><input type="text" value={form.bank_bic} onChange={set('bank_bic')} /></div>
        </div>
        <div className="field"><label>{t('Bank name')}</label><input type="text" value={form.bank_name} onChange={set('bank_name')} /></div>
      </>
    );
  };

  return (
    <div className="panel settings-card profile-card">
      <div className="section-title">{t('Business profile')}</div>
      <p className="sub-note">{t('These details are printed on every invoice you send, so fill them in once here.')}</p>

      <div className="sub-head">{t('Business')}</div>
      <div className="field-row">
        <div className="field"><label>{t('Trading name')}</label><input type="text" value={form.name} onChange={set('name')} /></div>
        <div className="field"><label>{t('Legal name (if different)')}</label><input type="text" placeholder={t('e.g. Sweet Candles GmbH')} value={form.legal_name} onChange={set('legal_name')} /></div>
      </div>
      <div className="field-row">
        <div className="field"><label>{t('What kind of business')}</label><input type="text" placeholder={t('e.g. Design studio')} value={form.business_type} onChange={set('business_type')} /></div>
        <div className="field"><label>{t('Country')}</label>
          <select value={form.country} onChange={(e) => changeCountry(e.target.value)}>
            {COUNTRIES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
          </select>
        </div>
      </div>
      <div className="field"><label>{t('Currency')}</label>
        <select value={form.currency} onChange={set('currency')}>
          <option value="EUR">{t('Euro (EUR)')}</option>
          <option value="USD">{t('US Dollar (USD)')}</option>
          <option value="GBP">{t('British Pound (GBP)')}</option>
        </select>
      </div>

      <div className="sub-head">{t('Address')}</div>
      <div className="field"><label>{t('Street and number')}</label><input type="text" value={form.street} onChange={set('street')} /></div>
      <div className="field-row three">
        <div className="field"><label>{t('Postal code')}</label><input type="text" value={form.postal_code} onChange={set('postal_code')} /></div>
        <div className="field"><label>{t('City')}</label><input type="text" value={form.city} onChange={set('city')} /></div>
        {setup.needsRegion && <div className="field"><label>{t('State / province')}</label><input type="text" value={form.region} onChange={set('region')} /></div>}
      </div>

      <div className="sub-head">{t('Tax')}</div>
      <div className="field-row">
        <div className="field">
          <label>{setup.taxIdLabel}</label>
          <input type="text" value={form.tax_number} onChange={set('tax_number')} />
        </div>
        {setup.vatIdLabel && (
          <div className="field">
            <label>{setup.vatIdLabel}</label>
            <input type="text" placeholder={setup.vatPlaceholder} value={form.vat_number} onChange={set('vat_number')} />
          </div>
        )}
      </div>
      {form.country === 'AT' || form.country === 'DE' ? (
        <p className="sub-note">{t('The tax number (Steuernummer) and the VAT number are two different numbers. Enter both if you have both.')}</p>
      ) : null}
      <div className="field-row">
        <div className="field"><label>{t('How you charge tax')}</label>
          <select value={form.tax_mode} onChange={set('tax_mode')}>
            {setup.taxModes.map((m) => <option key={m} value={m}>{t(TAX_MODES[m])}</option>)}
          </select>
        </div>
        {taxOn && (
          <div className="field"><label>{t('Usual tax rate (%)')}</label>
            {setup.rates.length ? (
              <select value={form.default_tax_rate} onChange={set('default_tax_rate')}>
                {[...new Set([...setup.rates, Number(form.default_tax_rate)])].map((r) => <option key={r} value={r}>{r}%</option>)}
              </select>
            ) : (
              <input type="number" min="0" max="100" step="0.01" value={form.default_tax_rate} onChange={set('default_tax_rate')} />
            )}
          </div>
        )}
      </div>

      <div className="sub-head">{t('Bank details for payments')}</div>
      <div className="field"><label>{t('Account holder')}</label><input type="text" placeholder={form.legal_name || form.name} value={form.bank_holder} onChange={set('bank_holder')} /></div>
      {bankFields()}

      <div className="sub-head">{t('Contact on invoices')}</div>
      <div className="field-row three">
        <div className="field"><label>{t('Email')}</label><input type="email" value={form.contact_email} onChange={set('contact_email')} /></div>
        <div className="field"><label>{t('Phone')}</label><input type="text" value={form.contact_phone} onChange={set('contact_phone')} /></div>
        <div className="field"><label>{t('Website')}</label><input type="text" value={form.website} onChange={set('website')} /></div>
      </div>

      <div className="sub-head">{t('Invoice defaults')}</div>
      <div className="field-row three">
        <div className="field"><label>{t('Number prefix')}</label><input type="text" placeholder="SC" maxLength={10} value={form.invoice_prefix} onChange={set('invoice_prefix')} /></div>
        <div className="field"><label>{t('First number')}</label><input type="number" min="1" value={form.invoice_start_number} onChange={set('invoice_start_number')} /></div>
        <div className="field"><label>{t('Payment due after (days)')}</label><input type="number" min="0" value={form.payment_terms_days} onChange={set('payment_terms_days')} /></div>
      </div>
      <p className="sub-note">{t('Invoices are numbered like {example} when you send them. Numbers are never reused.', { example: `${(form.invoice_prefix || 'INV').toUpperCase()}-${new Date().getFullYear()}-${String(form.invoice_start_number || 1).padStart(3, '0')}` })}</p>
      <div className="field"><label>{t('Invoice language')}</label>
        <select value={form.invoice_language} onChange={set('invoice_language')}>
          {INVOICE_LANGUAGES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
        </select>
      </div>
      <div className="field"><label>{t('Footer text (optional)')}</label>
        <textarea rows={2} placeholder={t('e.g. Thank you for your business!')} value={form.invoice_footer} onChange={set('invoice_footer')} />
      </div>

      {error && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 0 }}>{error}</p>}
      <button className="btn btn-primary" onClick={save} disabled={!dirty || saving}>
        {saving ? t('Saving…') : saved ? t('Saved') : t('Save changes')}
      </button>
    </div>
  );
}

export default function Settings({ business, userEmail, dropboxResult, onUpdateBusiness, onDeleteBusiness, onAccountDeleted, onSignOut }) {
  const { t } = useT();

  const [error, setError] = useState('');
  const [dropbox, setDropbox] = useState({ loading: true, email: null });
  const [dropboxBusy, setDropboxBusy] = useState(false);
  const [dropboxError, setDropboxError] = useState('');

  const [confirmBusiness, setConfirmBusiness] = useState(false);
  const [deletingBusiness, setDeletingBusiness] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  const loadDropbox = useCallback(async () => {
    const { data } = await supabase
      .from('storage_connections')
      .select('account_email')
      .eq('provider', 'dropbox')
      .maybeSingle();
    setDropbox({ loading: false, email: data ? (data.account_email || 'Connected') : null });
  }, []);

  useEffect(() => { loadDropbox(); }, [loadDropbox]);

  async function connectDropbox() {
    setDropboxError('');
    setDropboxBusy(true);
    try {
      const { url } = await api.startDropboxConnect();
      window.location.href = url;
    } catch (err) {
      setDropboxError(err.message || 'Could not start the Dropbox connection');
      setDropboxBusy(false);
    }
  }

  async function disconnectDropbox() {
    setDropboxError('');
    setDropboxBusy(true);
    try {
      await api.disconnectDropbox();
      await loadDropbox();
    } catch (err) {
      setDropboxError(err.message || 'Could not disconnect Dropbox');
    } finally {
      setDropboxBusy(false);
    }
  }

  async function handleDeleteBusiness() {
    setDeletingBusiness(true);
    try {
      await onDeleteBusiness(business);
    } catch (err) {
      setError(err.message || 'Could not delete the business');
      setDeletingBusiness(false);
      setConfirmBusiness(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Your business details, where receipts are stored, and your account.</p>
        </div>
      </div>

      <div className="settings-grid">
        <BusinessProfile business={business} onUpdateBusiness={onUpdateBusiness} />

        <div className="panel settings-card">
          <div className="section-title">Receipt storage</div>
          {dropboxResult === 'connected' && <p style={{ color: 'var(--accent-strong)', fontSize: 13, marginTop: 0 }}>Dropbox is connected.</p>}
          {dropboxResult === 'failed' && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 0 }}>The Dropbox connection did not go through. Please try again.</p>}
          <div className="storage-row">
            <div className="storage-icon" style={{ color: '#0061FE' }}><Icon name="dropbox" size={18} /></div>
            <div className="storage-main">
              <div className="storage-name">Dropbox</div>
              <div className={`storage-sub ${dropbox.email ? 'connected' : ''}`}>
                {dropbox.loading ? 'Checking…' : dropbox.email ? `Connected · ${dropbox.email}` : 'Not connected'}
              </div>
            </div>
            {!dropbox.loading && (dropbox.email ? (
              <button className="btn btn-sm" onClick={disconnectDropbox} disabled={dropboxBusy}>Disconnect</button>
            ) : (
              <button className="btn btn-sm btn-primary" onClick={connectDropbox} disabled={dropboxBusy}>Connect</button>
            ))}
          </div>
          {dropboxError && <p style={{ color: 'var(--red)', fontSize: 13 }}>{dropboxError}</p>}
          <div className="storage-note">
            <Icon name="eye" size={14} />
            <span>
              With Dropbox connected, receipt photos go into your own Dropbox (in an Apps folder, sorted by business) and
              HandyCFO keeps only the text we read from them. Without it, files are kept in private storage that only you can open.
            </span>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="section-title">Account</div>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Signed in as {userEmail}</div>
            <div className="settings-row-sub">Sign out on this device. Your data stays safe and you can sign back in any time.</div>
          </div>
          <button className="btn btn-sm" onClick={onSignOut}>Sign out</button>
        </div>
      </div>

      <div className="panel danger-zone">
        <div className="section-title" style={{ color: 'var(--red)' }}>Danger zone</div>
        {error && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 0 }}>{error}</p>}
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Delete this business</div>
            <div className="settings-row-sub">Removes {business.name} with all its invoices, expenses and inbox items.</div>
          </div>
          <button className="btn btn-sm" onClick={() => setConfirmBusiness(true)}>Delete business</button>
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Delete my account</div>
            <div className="settings-row-sub">Permanently erases your account and every business, invoice, expense, contact and message. This can't be undone.</div>
          </div>
          <button
            className="btn btn-sm"
            style={{ background: 'var(--red)', borderColor: 'var(--red)', color: '#fff' }}
            onClick={() => setShowDeleteAccount(true)}
          >
            Delete account
          </button>
        </div>
      </div>

      {confirmBusiness && (
        <ConfirmModal
          title="Delete business?"
          message={`Delete ${business.name} and all of its invoices, expenses and stored receipts? This can't be undone. Files already in your Dropbox stay there.`}
          busy={deletingBusiness}
          onConfirm={handleDeleteBusiness}
          onCancel={() => setConfirmBusiness(false)}
        />
      )}

      {showDeleteAccount && (
        <DeleteAccountModal
          email={userEmail}
          onClose={() => setShowDeleteAccount(false)}
          onDeleted={onAccountDeleted}
        />
      )}
    </div>
  );
}

function DeleteAccountModal({ email, onClose, onDeleted }) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const matches = typed.trim().toLowerCase() === String(email || '').toLowerCase();

  async function submit() {
    setBusy(true);
    setError('');
    try {
      await api.deleteAccount(typed.trim());
      await onDeleted();
    } catch (err) {
      setError(err.message || 'Could not delete the account');
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Delete your account"
      onClose={busy ? () => {} : onClose}
      maxWidth={420}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>Keep my account</button>
          <button
            className="btn"
            style={{ background: 'var(--red)', borderColor: 'var(--red)', color: '#fff', opacity: matches ? 1 : 0.5 }}
            onClick={submit}
            disabled={!matches || busy}
          >
            {busy ? 'Deleting…' : 'Delete everything'}
          </button>
        </>
      }
    >
      <ul className="delete-warning-list">
        <li>All your businesses, invoices and expenses are erased.</li>
        <li>Your contacts and messages are erased.</li>
        <li>Your Dropbox is disconnected. Files already in Dropbox stay there.</li>
        <li>This can't be undone.</li>
      </ul>
      <div className="field" style={{ marginBottom: 0 }}>
        <label>Type your email ({email}) to confirm</label>
        <input type="email" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
      </div>
      {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 0 }}>{error}</p>}
    </Modal>
  );
}
