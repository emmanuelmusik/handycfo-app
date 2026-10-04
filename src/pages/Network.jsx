import { useEffect, useState } from 'react';
import { useContacts } from '../hooks/useContacts';
import { api } from '../lib/api';
import { initialsOf } from '../lib/format';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Icon from '../components/layout/Icon';

export default function Network({ onOpenChat }) {
  const { contacts, loading, refetch } = useContacts();
  const [showAdd, setShowAdd] = useState(false);
  const [toRemove, setToRemove] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  // People who joined since they were added become connected.
  useEffect(() => {
    api.refreshNetwork().then((r) => { if (r.linked) refetch(); }).catch(() => {});
  }, [refetch]);

  const rows = contacts.filter((c) => filter === 'all' || c.relationship === filter);

  async function handleRemove() {
    setRemoving(true);
    setError('');
    try {
      await api.deleteContact(toRemove.id);
      setToRemove(null);
      await refetch();
    } catch (err) {
      setError(err.message || 'Could not remove this contact');
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Network</h1>
          <p className="page-sub">Your suppliers and clients. When they use HandyCFO too, you can message each other and send invoices straight into their inbox.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Icon name="plus" size={15} strokeWidth={2} />
          Add contact
        </button>
      </div>

      <div className="filter-pills" style={{ marginBottom: 14 }}>
        {['all', 'Supplier', 'Client'].map((f) => (
          <button key={f} className={`pill ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'Everyone' : `${f}s`}
          </button>
        ))}
      </div>

      {error && <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>}

      {loading ? (
        <p style={{ color: 'var(--text-faint)' }}>Loading…</p>
      ) : rows.length === 0 ? (
        <div className="panel"><div className="empty-hint">
          {contacts.length === 0 ? 'No contacts yet. Add a supplier or client with their email address.' : 'Nobody in this group yet.'}
        </div></div>
      ) : (
        <div className="contact-grid">
          {rows.map((c) => (
            <div className="contact-card" key={c.id}>
              <div className="contact-head">
                <div className="contact-avatar" style={{ background: c.color || '#3FBF9C' }}>{initialsOf(c.name)}</div>
                <div style={{ minWidth: 0 }}>
                  <div className="contact-name">{c.name}</div>
                  <div className="contact-type">{c.relationship}{c.email ? ` · ${c.email}` : ''}</div>
                </div>
              </div>
              <div className={`contact-status ${c.on_platform ? 'on' : 'off'}`}>
                <span className="dot" />
                {c.on_platform ? 'On HandyCFO' : 'Not on HandyCFO yet'}
              </div>
              <div className="contact-actions">
                <button className="btn btn-sm" disabled={!c.on_platform} onClick={() => onOpenChat(c.id)} title={c.on_platform ? '' : 'They need a HandyCFO account first'}>
                  <Icon name="message" size={14} />Message
                </button>
                <button className="btn btn-sm" onClick={() => setToRemove(c)}>
                  <Icon name="trash" size={14} />Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <AddContactModal
          onClose={() => setShowAdd(false)}
          onAdded={async () => { setShowAdd(false); await refetch(); }}
        />
      )}

      {toRemove && (
        <ConfirmModal
          title="Remove contact?"
          confirmLabel="Remove"
          message={`Remove ${toRemove.name} and your messages with them? Invoices and expenses that mention them are kept.`}
          busy={removing}
          onConfirm={handleRemove}
          onCancel={() => setToRemove(null)}
        />
      )}
    </div>
  );
}

function AddContactModal({ onClose, onAdded }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('Supplier');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    if (!name.trim()) return setError('Add a name.');
    setBusy(true);
    try {
      await api.addContact({ name: name.trim(), email: email.trim(), relationship });
      await onAdded();
    } catch (err) {
      setError(err.message || 'Could not add this contact');
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Add contact"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? 'Adding…' : 'Add contact'}</button>
        </>
      }
    >
      <div className="field">
        <label>Name</label>
        <input type="text" autoFocus placeholder="e.g. Brantwood Ltd." value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label>Email (we check if they already use HandyCFO)</label>
        <input type="email" placeholder="billing@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="field" style={{ marginBottom: 0 }}>
        <label>They are your</label>
        <select value={relationship} onChange={(e) => setRelationship(e.target.value)}>
          <option value="Supplier">Supplier (you pay them)</option>
          <option value="Client">Client (they pay you)</option>
        </select>
      </div>
      {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 0 }}>{error}</p>}
    </Modal>
  );
}
