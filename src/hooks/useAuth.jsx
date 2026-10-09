import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = "still checking"
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    // Keeps state in sync across tabs/token refreshes without polling.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // A token refresh when the page regains focus yields a new session object for the
      // same user. Keep the old one when nothing meaningful changed, so the app doesn't re-render.
      setSession((prev) => (prev && newSession && prev.user?.id === newSession.user?.id && prev.access_token === newSession.access_token ? prev : newSession));
    });
    return () => sub.subscription.unsubscribe();
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
    signInWithProvider: (provider) => supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } }),
    signOut: () => supabase.auth.signOut(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
