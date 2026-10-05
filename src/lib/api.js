import { supabase } from './supabaseClient';

const API_URL = String(import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');

// Every call to the Railway server (Dropbox connect, triggering
// jobs, anything that isn't a direct Supabase query) needs the
// user's current access token so the server's requireAuth
// middleware can identify them.
async function authedFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in');

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || `Request to ${path} failed (${res.status})`);
    if (body.code) err.code = body.code;
    if (body.duplicate) err.duplicate = body.duplicate;
    throw err;
  }
  return res.json();
}

// Downloads a file the server generates (like an invoice PDF) and saves it.
async function downloadFile(path, fallbackName) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in');
  const res = await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Download failed (${res.status})`);
  }
  const blob = await res.blob();
  const match = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = match ? match[1] : fallbackName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

const post = (path, body) => authedFetch(path, { method: 'POST', body: JSON.stringify(body || {}) });
const del = (path) => authedFetch(path, { method: 'DELETE' });

export const api = {
  startDropboxConnect: () => authedFetch('/auth/dropbox/start'),
  disconnectDropbox: () => authedFetch('/auth/dropbox/disconnect', { method: 'POST' }),

  // Financial Inbox
  scanReceipt: (payload) => post('/receipts/scan', payload),
  inboxFileLink: (docId) => authedFetch(`/inbox/${docId}/file`),
  confirmInboxDoc: (docId, fields, allowDuplicate = false) => post(`/inbox/${docId}/confirm`, allowDuplicate ? { ...fields, allowDuplicate: true } : fields),
  discardInboxDoc: (docId) => del(`/inbox/${docId}`),

  // Expenses
  expenseReceiptLink: (expenseId) => authedFetch(`/expenses/${expenseId}/receipt`),
  deleteExpense: (expenseId) => del(`/expenses/${expenseId}`),

  // Network, messages, invoices between users
  addContact: (fields) => post('/contacts', fields),
  deleteContact: (id) => del(`/contacts/${id}`),
  refreshNetwork: () => post('/network/refresh'),
  sendMessage: (contactId, body) => post('/messages', { contactId, body }),
  sendInvoice: (invoiceId, channels) => post(`/invoices/${invoiceId}/send`, channels ? { channels } : {}),
  downloadInvoicePdf: (invoiceId) => downloadFile(`/invoices/${invoiceId}/pdf`, 'Invoice.pdf'),

  // Account
  deleteBusiness: (id) => del(`/businesses/${id}`),
  deleteAccount: (confirmEmail) => post('/account/delete', { confirmEmail }),
};
