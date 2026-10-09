import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useT } from '../lib/i18n';
import logoFull from '../assets/logo-full.png';

export default function Login() {
  const { t } = useT();
  const { signIn, signUp, signInWithProvider } = useAuth();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [checkInbox, setCheckInbox] = useState(false);

  // If the confirmation link was expired or already used, Supabase sends the person
  // back here with the reason in the address. Show it instead of a silent login page.
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const reason = params.get('error_description');
    if (reason) {
      setError(t('{reason}. Sign in below, or sign up again to get a new link.', { reason: reason.replace(/\+/g, ' ') }));
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) throw error;
      } else {
        const { error } = await signUp(email, password);
        if (error) throw error;
        setCheckInbox(true);
      }
    } catch (err) {
      setError(err.message || t('Something went wrong'));
    } finally {
      setBusy(false);
    }
  }

  async function handleProvider(provider) {
    setError('');
    setBusy(true);
    const { error } = await signInWithProvider(provider);
    if (error) { setError(error.message || t('Something went wrong')); setBusy(false); }
  }

  if (checkInbox) {
    return (
      <div style={centerWrap}>
        <div className="panel" style={{ padding: 32, maxWidth: 380, textAlign: 'center' }}>
          <img src={logoFull} alt="HandyCFO" className="auth-logo" />
          <h2 style={{ fontFamily: 'var(--font-display)', marginTop: 0 }}>{t('Check your email')}</h2>
          <p style={{ color: 'var(--text-soft)' }}>
            {t('We sent a confirmation link to {email}. Open it and you will come straight back here, signed in.', { email: '\u0000' }).split('\u0000').map((part, i, arr) => (
              <span key={i}>{part}{i < arr.length - 1 && <strong>{email}</strong>}</span>
            ))}
          </p>
          <button className="btn btn-block" onClick={() => { setCheckInbox(false); setMode('signin'); }}>
            {t('Back to sign in')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={centerWrap}>
      <div className="panel" style={{ padding: 32, width: '100%', maxWidth: 380 }}>
        <img src={logoFull} alt="HandyCFO" className="auth-logo" />
        <h2 style={{ fontFamily: 'var(--font-display)', marginTop: 0, marginBottom: 4 }}>
          {mode === 'signin' ? t('Welcome back') : t('Create your account')}
        </h2>
        <p style={{ color: 'var(--text-soft)', marginTop: 0, marginBottom: 20, fontSize: 13.5 }}>
          {t('HandyCFO — my smart accountant')}
        </p>

        <button type="button" className="btn btn-block auth-provider" onClick={() => handleProvider('google')} disabled={busy}>
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
          {t('Continue with Google')}
        </button>
        <button type="button" className="btn btn-block auth-provider auth-apple" onClick={() => handleProvider('apple')} disabled={busy}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.37 1.43c0 1.14-.46 2.22-1.19 3-.78.84-2.06 1.49-3.09 1.4-.13-1.1.42-2.25 1.15-3 .8-.85 2.18-1.47 3.13-1.4zM20.5 17.1c-.55 1.27-.82 1.84-1.53 2.96-1 1.56-2.4 3.5-4.14 3.51-1.55.02-1.95-1-4.05-.99-2.1.01-2.54 1.01-4.09.99-1.74-.02-3.07-1.77-4.07-3.33C-.2 15.9-.5 10.9 1.3 8.1c1.27-1.99 3.27-3.15 5.15-3.15 1.92 0 3.12 1.05 4.71 1.05 1.54 0 2.48-1.05 4.7-1.05 1.67 0 3.45.91 4.72 2.48-4.15 2.27-3.48 8.2.92 9.67z"/></svg>
          {t('Continue with Apple')}
        </button>
        <div className="auth-or"><span>{t('or')}</span></div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>{t('Email')}</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 8 }}>
            <label>{t('Password')}</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 8, marginBottom: 8 }}>{error}</p>
          )}

          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 12 }} disabled={busy}>
            {busy ? t('Please wait…') : mode === 'signin' ? t('Sign in') : t('Sign up')}
          </button>
        </form>

        <button
          className="btn btn-ghost btn-block"
          style={{ marginTop: 10 }}
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}
        >
          {mode === 'signin' ? t("Don't have an account? Sign up") : t('Already have an account? Sign in')}
        </button>
        <p className="auth-legal">
          <a href="/privacy" target="_blank" rel="noopener noreferrer">{t('Privacy Policy')}</a>
          {' · '}
          <a href="/support" target="_blank" rel="noopener noreferrer">{t('Support')}</a>
        </p>
      </div>
    </div>
  );
}

const centerWrap = {
  minHeight: '100dvh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
  background: 'var(--bg)',
};
