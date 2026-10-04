import { supabase } from './supabaseClient';

const API_URL = import.meta.env.VITE_API_URL;

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

export const api = {
  startDropboxConnect: () => authedFetch('/auth/dropbox/start'),
  disconnectDropbox: () => authedFetch('/auth/dropbox/disconnect', { method: 'POST' }),
};
