import { PERIODS, yearOptions } from '../lib/period';

// Pills for the quick choices, plus a year list or two date fields
// when "Year" or "Custom" is picked.
export default function PeriodPicker({ value, onChange, monthsOnly = false }) {
  const set = (patch) => onChange({ ...value, ...patch });
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="field" style={{ marginBottom: 0, maxWidth: 240 }}>
        <label>Show figures for</label>
        <select value={value.key} onChange={(e) => set({ key: e.target.value })}>
          {PERIODS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
      </div>

      {value.key === 'year' && (
        <div className="field" style={{ marginTop: 12, marginBottom: 0, maxWidth: 240 }}>
          <label>Which year</label>
          <select value={value.year} onChange={(e) => set({ year: Number(e.target.value) })}>
            {yearOptions().map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      )}

      {value.key === 'custom' && (
        <div className="panel" style={{ padding: 16, marginTop: 12 }}>
          <div className="field-row">
            <div className="field" style={{ marginBottom: 0 }}>
              <label>From</label>
              <input type={monthsOnly ? 'month' : 'date'} value={monthsOnly ? value.from.slice(0, 7) : value.from}
                max={monthsOnly ? value.to.slice(0, 7) : value.to}
                onChange={(e) => set({ from: monthsOnly ? `${e.target.value}-01` : e.target.value })} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>To</label>
              <input type={monthsOnly ? 'month' : 'date'} value={monthsOnly ? value.to.slice(0, 7) : value.to}
                min={monthsOnly ? value.from.slice(0, 7) : value.from}
                onChange={(e) => {
                  if (!monthsOnly) return set({ to: e.target.value });
                  const [yy, mm] = e.target.value.split('-').map(Number);
                  const last = new Date(yy, mm, 0).getDate();
                  set({ to: `${e.target.value}-${String(last).padStart(2, '0')}` });
                }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
