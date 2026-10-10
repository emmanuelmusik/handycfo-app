// Google / Apple sign-in inside the iPhone/Android app.
// The provider page opens in the in-app browser; when it finishes, Supabase sends the person back
// to the app through the custom address below, and we finish the sign-in here.
import { Capacitor } from '@capacitor/core';
import { supabase } from './supabaseClient';

export const APP_SCHEME = 'biz.thejohmacos.handycfo';
const CALLBACK = `${APP_SCHEME}://auth-callback`;

export const isNative = () => Capacitor.isNativePlatform();

export async function signInWithProviderNative(provider) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: CALLBACK, skipBrowserRedirect: true },
  });
  if (error) return { error };
  const { Browser } = await import('@capacitor/browser');
  await Browser.open({ url: data.url });
  return { error: null };
}

// Call once at start. Returns a function that stops listening.
export function listenForAuthCallback() {
  if (!isNative()) return () => {};
  let handle = null;
  let stopped = false;
  import('@capacitor/app').then(async ({ App }) => {
    const h = await App.addListener('appUrlOpen', async ({ url }) => {
      if (!url || !url.startsWith(`${APP_SCHEME}://`)) return;
      try { (await import('@capacitor/browser')).Browser.close(); } catch { /* already closed */ }
      // Parse as a normal address so we can read both ?query and #fragment parts.
      const u = new URL(url.replace(/^[^:]+:\/\//, 'https://'));
      const frag = new URLSearchParams(u.hash.replace(/^#/, ''));
      const query = u.searchParams;
      const accessToken = frag.get('access_token');
      const refreshToken = frag.get('refresh_token');
      const code = query.get('code');
      if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      } else if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      } else {
        const reason = frag.get('error_description') || query.get('error_description');
        if (reason) window.dispatchEvent(new CustomEvent('handycfo:auth-error', { detail: reason.replace(/\+/g, ' ') }));
      }
    });
    if (stopped) h.remove(); else handle = h;
  });
  return () => { stopped = true; handle?.remove(); };
}
