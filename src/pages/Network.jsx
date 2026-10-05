import { useEffect, useState } from 'react';
import { useContacts } from '../hooks/useContacts';
import { api } from '../lib/api';
import { initialsOf } from '../lib/format';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Icon from '../components/layout/Icon';
import { useT } from '../lib/i18n';
import { COUNTRIES, INVOICE_LANGUAGES, setupFor } from '../lib/countries';

export default function Network({ onOpenChat }) {
  const { t } = useT();
  const { contacts, loading, refetch } = useContacts();
  const [showAdd, setShowAdd] = useState(false);
  const [toRemove, setToRemove] = useState(null);
  const [editing, setEditing] = useState(null);
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
      setError(err.message || t('Could not remove this contact'));
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">{t('Network')}</h1>
          <p className="page-sub">{t('Your suppliers and clients. When they use HandyCFO too, you can message each other and send invoices straight into their inbox.')}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Icon name="plus" size={15} strokeWidth={2} />
          {t('Add contact')}
        </button>
      </div>

      <div className="filter-pills" style={{ marginBottom: 14 }}>
        {['all', 'Supplier', 'Client'].map((f) => (
          <button key={f} className={`pill ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? t('Everyone') : f === 'Supplier' ? t('Suppliers') : t('Clients')}
          </button>
        ))}
      </div>

      {error && <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>}

      {loading ? (
        <p style={{ color: 'var(--text-faint)' }}>{t('Loading…')}</p>
      ) : rows.length === 0 ? (
        <div className="panel"><div className="empty-hint">
          {contacts.length === 0 ? t('No contacts yet. Add a supplier or client with their email address.') : t('Nobody in this group yet.')}
        </div></div>
      ) : (
        <div className="contact-grid">
          {rows.map((c) => (
            <div className="contact-card" key={c.id}>
              <div className="contact-head">
                <div className="contact-avatar" style={{ background: c.color || '#3FBF9C' }}>{initialsOf(c.name)}</div>
                <div style={{ minWidth: 0 }}>
                  <div className="contact-name">{c.name}</div>
                  <div className="contact-type">{t(c.relationship)}{c.email ? ` · ${c.email}` : ''}</div>
                </div>
              </div>
              <div className={`contact-status ${c.on_platform ? 'on' : 'off'}`}>
                <span className="dot" />
                {c.on_platform ? t('On HandyCFO') : t('Not on HandyCFO yet')}
              </div>
              <div className="contact-actions">
                <button className="btn btn-sm" disabled={!c.on_platform} onClick={() => onOpenChat(c.id)} title={c.on_platform ? '' : t('They need a HandyCFO account first')}>
                  <Icon name="message" size={14} />{t('Message')}
                </button>
                <button className="btn btn-sm" onClick={() => setEditing(c)}>
                  <Icon name="edit" size={14} />{t('Edit')}
                </button>
                <button className="btn btn-sm" onClick={() => setToRemove(c)}>
                  <Icon name="trash" size={14} />{t('Remove')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <ContactModal
          onClose={() => setShowAdd(false)}
          onSaved={async () => { setShowAdd(false); await refetch(); }}
        />
      )}

      {editing && (
        <ContactModal
          contact={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await refetch(); }}
        />
      )}

      {toRemove && (
        <ConfirmModal
          title={t('Remove contact?')}
          confirmLabel={t('Remove')}
          message={t('Remove {name} and your messages with them? Invoices and expenses that mention them are kept.', { name: toRemove.name })}
          busy={removing}
          onConfirm={handleRemove}
          onCancel={() => setToRemove(null)}
        />
      )}
    </div>
  );
}

function ContactModal({ contact, onClose, onSaved }) {
  const { t } = useT();
  const edit = !!contact;
  const [f, setF] = useState({
    name: contact?.name || '', email: contact?.email || '', relationship: contact?.relationship || 'Supplier',
    street: contact?.street || '', postalCode: contact?.postal_code || '', city: contact?.city || '', region: contact?.region || '',
    country: contact?.country || '', taxId: contact?.tax_id || '', language: contact?.language || '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const setup = setupFor(f.country);

  async function submit() {
    setError('');
    if (!f.name.trim()) return setError(t('Add a name.'));
    setBusy(true);
    try {
      const body = { ...f, name: f.name.trim(), email: f.email.trim() };
      if (edit) await api.updateContact(contact.id, body);
      else await api.addContact(body);
      await onSaved();
    } catch (err) {
      setError(err.message || t('Could not save this contact'));
      setBusy(false);
    }
  }

  return (
    <Modal
      title={edit ? t('Edit contact') : t('Add contact')}
      onClose={onClose}
      maxWidth={520}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>{t('Cancel')}</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? t('Saving…') : edit ? t('Save') : t('Add contact')}</button>
        </>
      }
    >
      <div className="field">
        <label>{t('Name')}</label>
        <input type="text" autoFocus placeholder={t('e.g. Brantwood Ltd.')} value={f.name} onChange={set('name')} />
      </div>
      <div className="field">
        <label>{t('Email (we check if they already use HandyCFO)')}</label>
        <input type="email" placeholder="billing@company.com" value={f.email} onChange={set('email')} />
      </div>
      {!edit && (
        <div className="field">
          <label>{t('They are your')}</label>
          <select value={f.relationship} onChange={set('relationship')}>
            <option value="Supplier">{t('Supplier (you pay them)')}</option>
            <option value="Client">{t('Client (they pay you)')}</option>
          </select>
        </div>
      )}
      <div className="sub-head">{t('Address and tax details (used on invoices)')}</div>
      <div className="field"><label>{t('Street and number')}</label><input type="text" value={f.street} onChange={set('street')} /></div>
      <div className="field-row three">
        <div className="field"><label>{t('Postal code')}</label><input type="text" value={f.postalCode} onChange={set('postalCode')} /></div>
        <div className="field"><label>{t('City')}</label><input type="text" value={f.city} onChange={set('city')} /></div>
        {setup.needsRegion && <div className="field"><label>{t('State / province')}</label><input type="text" value={f.region} onChange={set('region')} /></div>}
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
      <div className="field" style={{ marginBottom: 0 }}>
        <label>{t('Language for their invoices')}</label>
        <select value={f.language} onChange={set('language')}>
          <option value="">{t('Same as my business')}</option>
          {INVOICE_LANGUAGES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
        </select>
      </div>
      {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 0 }}>{error}</p>}
    </Modal>
  );
}
