import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useT } from '../lib/i18n';

export default function Login() {
  const { t } = useT();
  const { signIn, signUp } = useAuth();
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

  if (checkInbox) {
    return (
      <div style={centerWrap}>
        <div className="panel" style={{ padding: 32, maxWidth: 380, textAlign: 'center' }}>
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
        <h2 style={{ fontFamily: 'var(--font-display)', marginTop: 0, marginBottom: 4 }}>
          {mode === 'signin' ? t('Welcome back') : t('Create your account')}
        </h2>
        <p style={{ color: 'var(--text-soft)', marginTop: 0, marginBottom: 20, fontSize: 13.5 }}>
          {t('HandyCFO — my smart accountant')}
        </p>

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
