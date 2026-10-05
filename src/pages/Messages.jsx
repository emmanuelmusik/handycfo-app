import { useEffect, useMemo, useRef, useState } from 'react';
import { useContacts } from '../hooks/useContacts';
import { useMessages } from '../hooks/useMessages';
import { useInbox } from '../hooks/useInbox';
import { api } from '../lib/api';
import { fmtMoney, fmtDate, initialsOf, timeAgo } from '../lib/format';
import Modal from '../components/Modal';
import Icon from '../components/layout/Icon';
import { useT } from '../lib/i18n';

export default function Messages({ business, initialContactId, onNavigate, onChanged }) {
  const { t } = useT();
  const { contacts, loading: contactsLoading } = useContacts();
  const { messages, loading: msgLoading, refetch, markRead } = useMessages();
  const { docs } = useInbox(business.id);
  const [openId, setOpenId] = useState(initialContactId || null);

  useEffect(() => { if (initialContactId) setOpenId(initialContactId); }, [initialContactId]);

  const conversations = useMemo(() => {
    const byContact = new Map();
    messages.forEach((m) => {
      const cur = byContact.get(m.contact_id) || { last: null, unread: 0 };
      cur.last = m;
      if (m.sender === 'them' && !m.read_at) cur.unread += 1;
      byContact.set(m.contact_id, cur);
    });
    return contacts
      .filter((c) => byContact.has(c.id) || c.on_platform)
      .map((c) => ({ contact: c, ...(byContact.get(c.id) || { last: null, unread: 0 }) }))
      .sort((a, b) => (b.last?.created_at || '').localeCompare(a.last?.created_at || ''));
  }, [contacts, messages]);

  const incoming = docs.filter((d) => d.source === 'supplier' && d.state === 'ready');
  const openContact = contacts.find((c) => c.id === openId);

  function openThread(id) {
    setOpenId(id);
    markRead(id).then(() => onChanged?.());
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">{t('Messages')}</h1>
          <p className="page-sub">{t('Talk to suppliers and clients who use HandyCFO, and see invoices they have sent you.')}</p>
        </div>
      </div>

      <div className="two-col">
        <div className="panel" style={{ padding: 18 }}>
          <div className="section-title">{t('Conversations')}</div>
          {(contactsLoading || msgLoading) && <div className="empty-hint">{t('Loading…')}</div>}
          {!contactsLoading && !msgLoading && conversations.length === 0 && (
            <div className="empty-hint">
              {t('No conversations yet. Add a contact who uses HandyCFO in Network, then say hello.')}
              <div style={{ marginTop: 12 }}>
                <button className="btn btn-sm" onClick={() => onNavigate('network')}>{t('Go to Network')}</button>
              </div>
            </div>
          )}
          {conversations.map(({ contact, last, unread }) => (
            <div className="conversation-row" key={contact.id} onClick={() => openThread(contact.id)}>
              <div className="contact-avatar" style={{ background: contact.color || '#3FBF9C' }}>{initialsOf(contact.name)}</div>
              <div className="conversation-main">
                <div className="conversation-name">{contact.name}{unread > 0 && <span className="unread-dot" />}</div>
                <div className="conversation-preview">{last ? (last.sender === 'me' ? t('You: {message}', { message: last.body }) : last.body) : t('Say hello')}</div>
              </div>
              {last && <div className="cell-soft" style={{ fontSize: 11.5 }}>{timeAgo(last.created_at)}</div>}
            </div>
          ))}
        </div>

        <div className="panel" style={{ padding: 18 }}>
          <div className="section-title">{t('Incoming invoices')}</div>
          {incoming.length === 0 && <div className="empty-hint">{t('Invoices that suppliers send you on HandyCFO appear here.')}</div>}
          {incoming.map((d) => (
            <div className="incoming-invoice-row" key={d.id}>
              <div className="incoming-invoice-main">
                <div className="incoming-invoice-name">{d.extracted_merchant || d.file_name}</div>
                <div className="incoming-invoice-sub">
                  {fmtMoney(d.extracted_amount, d.extracted_currency || business.currency)} · {fmtDate(d.extracted_date)}
                </div>
              </div>
              <button className="btn btn-sm btn-primary" onClick={() => onNavigate('inbox')}>{t('Review')}</button>
            </div>
          ))}
        </div>
      </div>

      {openContact && (
        <ChatModal
          contact={openContact}
          messages={messages.filter((m) => m.contact_id === openContact.id)}
          onClose={() => setOpenId(null)}
          onSent={refetch}
          onViewed={() => markRead(openContact.id).then(() => onChanged?.())}
        />
      )}
    </div>
  );
}

function ChatModal({ contact, messages, onClose, onSent, onViewed }) {
  const { t } = useT();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const threadRef = useRef(null);
  const unreadCount = messages.filter((m) => m.sender === 'them' && !m.read_at).length;

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages.length]);

  // New messages arriving while the chat is open count as read.
  useEffect(() => { if (unreadCount > 0) onViewed(); }, [unreadCount]); // eslint-disable-line react-hooks/exhaustive-deps

  async function send() {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    setError('');
    try {
      await api.sendMessage(contact.id, body);
      setText('');
      await onSent();
    } catch (err) {
      setError(err.message || t('Could not send the message'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={contact.name} onClose={onClose}>
      <div style={{ margin: -20 }}>
        <div className="chat-thread" ref={threadRef}>
          {messages.length === 0 && <div className="chat-bubble system">{t('No messages yet. Say hello.')}</div>}
          {messages.map((m) => (
            <div key={m.id} className={`chat-bubble ${m.sender}`}>{m.body}</div>
          ))}
        </div>
        {error && <p style={{ color: 'var(--red)', fontSize: 12.5, margin: '0 20px 8px' }}>{error}</p>}
        {contact.on_platform ? (
          <div className="chat-input-row">
            <input
              type="text"
              placeholder={t('Write a message…')}
              value={text}
              maxLength={2000}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
            />
            <button className="chat-send-btn" onClick={send} disabled={busy} aria-label={t('Send')}><Icon name="send" size={16} /></button>
          </div>
        ) : (
          <div className="chat-input-row cell-soft" style={{ fontSize: 12.5 }}>
            {t("{name} is not on HandyCFO yet, so you can't message them here.", { name: contact.name })}
          </div>
        )}
      </div>
    </Modal>
  );
}
