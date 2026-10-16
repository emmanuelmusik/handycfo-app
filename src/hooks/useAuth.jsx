import { clearCache } from '../lib/offlineCache';
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { isNative, listenForAuthCallback, signInWithProviderNative } from '../lib/nativeAuth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = "still checking"
  const [profile, setProfile] = useState(null);
  // True while the person is setting a new password after opening the reset link from their email.
  const [recovery, setRecovery] = useState(() => /type=recovery/.test(window.location.hash));

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const stopListening = listenForAuthCallback();

    // Keeps state in sync across tabs/token refreshes without polling.
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      // A token refresh when the page regains focus yields a new session object for the
      // same user. Keep the old one when nothing meaningful changed, so the app doesn't re-render.
      setSession((prev) => (prev && newSession && prev.user?.id === newSession.user?.id && prev.access_token === newSession.access_token ? prev : newSession));
    });
    return () => { sub.subscription.unsubscribe(); stopListening(); };
  }, []);

  useEffect(() => {
    if (!session?.user) { setProfile(null); return; }
    supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => setProfile(data));
  }, [session?.user?.id]);

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading: session === undefined,
    // The confirmation link brings the person back to wherever they signed up (this site).
    signUp: (email, password) => supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } }),
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    // Google / Apple: Supabase sends the person to the provider and back to this site, signed in.
    signInWithProvider: (provider) => (isNative()
      ? signInWithProviderNative(provider)
      : supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } })),
    recovery,
    // The email link opens the web app, where the new password is set; then sign in as usual.
    resetPassword: (email) => supabase.auth.resetPasswordForEmail(email, { redirectTo: 'https://handycfo-app.vercel.app' }),
    updatePassword: async (password) => {
      const res = await supabase.auth.updateUser({ password });
      if (!res.error) { setRecovery(false); window.history.replaceState(null, '', window.location.pathname); }
      return res;
    },
    signOut: () => { clearCache(); return supabase.auth.signOut(); },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
