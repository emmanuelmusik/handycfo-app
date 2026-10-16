import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useT } from '../lib/i18n';
import logoFull from '../assets/logo-full.png';

export default function SetNewPassword() {
  const { t } = useT();
  const { updatePassword, signOut } = useAuth();
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    const { error } = await updatePassword(pw);
    setBusy(false);
    if (error) setError(error.message || t('Something went wrong'));
    else setDone(true);
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'var(--bg)' }}>
      <div className="panel" style={{ padding: 32, width: '100%', maxWidth: 380 }}>
        <img src={logoFull} alt="HandyCFO" className="auth-logo" />
        <h2 style={{ fontFamily: 'var(--font-display)', marginTop: 0 }}>{t('Choose a new password')}</h2>
        {done ? (
          <>
            <p style={{ color: 'var(--text-soft)' }}>{t('Your password is changed. Open the HandyCFO app and sign in with it.')}</p>
            <button className="btn btn-primary btn-block" onClick={() => signOut()}>{t('Continue')}</button>
          </>
        ) : (
          <form onSubmit={submit}>
            <div className="field">
              <label>{t('New password')}</label>
              <input type={show ? 'text' : 'password'} required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} />
            </div>
            <label style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
              <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> {t('Show password')}
            </label>
            {error && <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>}
            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>{busy ? t('Please wait…') : t('Save password')}</button>
          </form>
        )}
      </div>
    </div>
  );
}
