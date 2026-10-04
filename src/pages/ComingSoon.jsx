export default function ComingSoon({ title }) {
  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-sub">Not wired up to real data yet — next on the list.</p>
        </div>
      </div>
      <div className="panel" style={{ padding: 40, textAlign: 'center', color: 'var(--text-faint)' }}>
        This screen exists in the prototype and just hasn't been ported to the real app yet.
      </div>
    </div>
  );
}
