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
    throw new Error(body.error || `Request to ${path} failed (${res.status})`);
  }
  return res.json();
}

const post = (path, body) => authedFetch(path, { method: 'POST', body: JSON.stringify(body || {}) });
const del = (path) => authedFetch(path, { method: 'DELETE' });

export const api = {
  startDropboxConnect: () => authedFetch('/auth/dropbox/start'),
  disconnectDropbox: () => authedFetch('/auth/dropbox/disconnect', { method: 'POST' }),

  // Financial Inbox
  scanReceipt: (payload) => post('/receipts/scan', payload),
  inboxFileLink: (docId) => authedFetch(`/inbox/${docId}/file`),
  confirmInboxDoc: (docId, fields) => post(`/inbox/${docId}/confirm`, fields),
  discardInboxDoc: (docId) => del(`/inbox/${docId}`),

  // Expenses
  expenseReceiptLink: (expenseId) => authedFetch(`/expenses/${expenseId}/receipt`),
  deleteExpense: (expenseId) => del(`/expenses/${expenseId}`),

  // Network, messages, invoices between users
  addContact: (fields) => post('/contacts', fields),
  deleteContact: (id) => del(`/contacts/${id}`),
  refreshNetwork: () => post('/network/refresh'),
  sendMessage: (contactId, body) => post('/messages', { contactId, body }),
  sendInvoice: (invoiceId) => post(`/invoices/${invoiceId}/send`),

  // Account
  deleteBusiness: (id) => del(`/businesses/${id}`),
  deleteAccount: (confirmEmail) => post('/account/delete', { confirmEmail }),
};
