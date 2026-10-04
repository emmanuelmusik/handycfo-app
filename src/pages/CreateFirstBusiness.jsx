import { useState } from 'react';

export default function CreateFirstBusiness({ onCreate }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError('');
    try {
      await onCreate({ name: name.trim(), businessType: type.trim() || 'New business' });
    } catch (err) {
      setError(err.message || 'Could not create the business');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="panel" style={{ padding: 32, width: '100%', maxWidth: 420 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', marginTop: 0, marginBottom: 4 }}>
          Let's set up your first business
        </h2>
        <p style={{ color: 'var(--text-soft)', marginTop: 0, marginBottom: 20, fontSize: 13.5 }}>
          You can add more later, and switch between them from the sidebar.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Business name</label>
            <input
              type="text"
              autoFocus
              placeholder="e.g. The Johmacos"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="field" style={{ marginBottom: 8 }}>
            <label>What it does</label>
            <input
              type="text"
              placeholder="e.g. Freelance design"
              value={type}
              onChange={(e) => setType(e.target.value)}
            />
          </div>
          {error && <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 12 }} disabled={busy}>
            {busy ? 'Creating…' : 'Get started'}
          </button>
        </form>
      </div>
    </div>
  );
}
