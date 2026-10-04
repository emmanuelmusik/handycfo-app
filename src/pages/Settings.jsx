import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { api } from '../lib/api';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Icon from '../components/layout/Icon';

export default function Settings({ business, userEmail, dropboxResult, onUpdateBusiness, onDeleteBusiness, onAccountDeleted }) {
  const [name, setName] = useState(business.name);
  const [type, setType] = useState(business.business_type || '');
  const [vat, setVat] = useState(business.vat_number || '');
  const [currency, setCurrency] = useState(business.currency || 'EUR');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
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

  const dirty = name !== business.name || type !== (business.business_type || '')
    || vat !== (business.vat_number || '') || currency !== business.currency;

  async function saveProfile() {
    setError('');
    if (!name.trim()) return setError('The business needs a name.');
    setSaving(true);
    try {
      await onUpdateBusiness(business.id, { name: name.trim(), businessType: type.trim(), vatNumber: vat.trim(), currency });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message || 'Could not save your changes');
    } finally {
      setSaving(false);
    }
  }

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
        <div className="panel settings-card">
          <div className="section-title">Business profile</div>
          <div className="field">
            <label>Business name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label>What kind of business</label>
            <input type="text" placeholder="e.g. Design studio" value={type} onChange={(e) => setType(e.target.value)} />
          </div>
          <div className="field">
            <label>VAT number</label>
            <input type="text" placeholder="ATU12345678" value={vat} onChange={(e) => setVat(e.target.value)} />
          </div>
          <div className="field">
            <label>Currency</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="EUR">Euro (EUR)</option>
              <option value="USD">US Dollar (USD)</option>
              <option value="GBP">British Pound (GBP)</option>
            </select>
          </div>
          {error && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 0 }}>{error}</p>}
          <button className="btn btn-primary" onClick={saveProfile} disabled={!dirty || saving}>
            {saving ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
          </button>
        </div>

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

      <div className="panel danger-zone">
        <div className="section-title" style={{ color: 'var(--red)' }}>Danger zone</div>
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
